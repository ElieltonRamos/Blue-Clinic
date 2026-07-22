import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';
import P from 'pino';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { IWhatsappProvider } from '../interfaces/whatsapp-provider.interface.js';
import { NormalizedIncomingMessage } from '../interfaces/whatsapp-provider.interface.js';

const pinoLogger = P({ level: 'silent' });

// Fix #4: caminho absoluto e configurável, não depende mais do cwd do processo.
const SESSIONS_DIR =
  process.env.WHATSAPP_SESSIONS_DIR ?? path.resolve(process.cwd(), 'sessions');

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

@Injectable()
export class WhatssapBaileysProvider implements IWhatsappProvider {
  private readonly logger = new Logger(WhatssapBaileysProvider.name);
  private readonly sockets = new Map<number, WASocket>();

  // Fix #1: promises de conexão em andamento, para deduplicar chamadas concorrentes.
  private readonly connecting = new Map<number, Promise<void>>();

  // Fix #2: contador de tentativas por empresa, para backoff exponencial.
  private readonly reconnectAttempts = new Map<number, number>();
  private readonly reconnectTimers = new Map<number, NodeJS.Timeout>();

  /**
   * Emite:
   *  - 'message' (companyId: number, msg: NormalizedIncomingMessage)
   *  - 'status'  (companyId: number, status: 'qr_pending' | 'connected' | 'disconnected', qr?: string)
   * Um listener externo (fora deste provider) escuta e encaminha pro WhatssapCoreService,
   * evitando dependência circular Core <-> BaileysProvider.
   */
  readonly events = new EventEmitter();

  constructor(private readonly prisma: PrismaService) {}

  async connect(companyId: number): Promise<void> {
    if (this.sockets.has(companyId)) return;

    // Fix #1: se já existe uma conexão em andamento para essa empresa, reusa a mesma promise
    // em vez de criar um segundo socket.
    const inFlight = this.connecting.get(companyId);
    if (inFlight) return inFlight;

    const promise = this.doConnect(companyId).finally(() => {
      this.connecting.delete(companyId);
    });

    this.connecting.set(companyId, promise);
    return promise;
  }

  private async doConnect(companyId: number): Promise<void> {
    const sessionPath = this.getSessionPath(companyId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
      },
      printQRInTerminal: false,
      logger: pinoLogger,
    });

    sock.ev.on('creds.update', () => {
      void saveCreds();
    });

    sock.ev.on('connection.update', (update) => {
      void this.handleConnectionUpdate(companyId, update);
    });

    sock.ev.on('messages.upsert', ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;

      const remoteJid = m.key.remoteJid;
      if (!remoteJid) return;

      // Fix #5: ignora mensagens de broadcast/status, que não têm remetente real utilizável.
      if (remoteJid === 'status@broadcast') return;

      const isGroup = remoteJid.endsWith('@g.us');

      // Em grupos, o remetente real vem em `participant`; em conversas 1:1, é o próprio remoteJid.
      const senderJid = isGroup ? m.key.participant : remoteJid;
      if (!senderJid) return;

      const phone = senderJid.split('@')[0].split(':')[0];
      if (!phone) return;

      const text =
        m.message.conversation ?? m.message.extendedTextMessage?.text ?? '';

      if (!text) return;

      const normalized: NormalizedIncomingMessage = {
        phone,
        text,
        wamid: m.key.id ?? undefined,
        fromMe: !!m.key.fromMe,
      };

      this.events.emit('message', companyId, normalized);
    });

    this.sockets.set(companyId, sock);
  }

  private async handleConnectionUpdate(
    companyId: number,
    update: Partial<{
      connection: 'close' | 'connecting' | 'open';
      lastDisconnect: { error?: Error } | undefined;
      qr: string;
    }>,
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await this.updateStatus(companyId, 'qr_pending', qr);
      this.events.emit('status', companyId, 'qr_pending', qr);
    }

    if (connection === 'open') {
      this.reconnectAttempts.delete(companyId);
      await this.updateStatus(companyId, 'connected');
      this.events.emit('status', companyId, 'connected');
    }

    if (connection === 'close') {
      this.sockets.delete(companyId);

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode as
        | DisconnectReason
        | undefined;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      await this.updateStatus(companyId, 'disconnected');
      this.events.emit('status', companyId, 'disconnected');

      if (shouldReconnect) {
        this.scheduleReconnect(companyId, statusCode);
      } else {
        this.logger.warn(
          `Baileys deslogado (company ${companyId}) — necessário novo QR`,
        );
        // Fix #3: limpa a sessão inválida em disco para forçar geração de novo QR
        // na próxima chamada a connect(), em vez de reusar credenciais mortas.
        await this.clearSession(companyId);
      }
    }
  }

  // Fix #2: reconexão com backoff exponencial (1s, 2s, 4s... até 30s) em vez de retry imediato.
  private scheduleReconnect(companyId: number, statusCode?: number): void {
    const existingTimer = this.reconnectTimers.get(companyId);
    if (existingTimer) clearTimeout(existingTimer);

    const attempt = (this.reconnectAttempts.get(companyId) ?? 0) + 1;
    this.reconnectAttempts.set(companyId, attempt);

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** (attempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    this.logger.warn(
      `Baileys desconectado (company ${companyId}, code ${statusCode}). ` +
        `Tentativa ${attempt} de reconexão em ${delay}ms.`,
    );

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(companyId);
      this.connect(companyId).catch((err) => {
        this.logger.error(
          `Falha ao reconectar Baileys (company ${companyId}): ${err instanceof Error ? err.message : err}`,
        );
      });
    }, delay);

    this.reconnectTimers.set(companyId, timer);
  }

  async disconnect(companyId: number): Promise<void> {
    const timer = this.reconnectTimers.get(companyId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(companyId);
    }
    this.reconnectAttempts.delete(companyId);

    const sock = this.sockets.get(companyId);
    if (!sock) return;

    void sock.end(undefined);
    this.sockets.delete(companyId);
    await this.updateStatus(companyId, 'disconnected');
  }

  async sendText(
    companyId: number,
    to: string,
    message: string,
  ): Promise<string | null> {
    const sock = this.sockets.get(companyId);
    if (!sock) {
      throw new Error(`Baileys não conectado para a empresa ${companyId}`);
    }

    const jid = `${to}@s.whatsapp.net`;
    const res = await sock.sendMessage(jid, { text: message });
    return res?.key?.id ?? null;
  }

  sendTemplate(): Promise<string | null> {
    return Promise.reject(
      new Error('Baileys não suporta templates aprovados pela Meta'),
    );
  }

  async getStatus(
    companyId: number,
  ): Promise<{ status: string | null; qr: string | null }> {
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { baileysStatus: true, baileysQr: true },
    });

    return {
      status: config?.baileysStatus ?? null,
      qr: config?.baileysQr ?? null,
    };
  }

  private getSessionPath(companyId: number): string {
    return path.join(SESSIONS_DIR, String(companyId));
  }

  private async clearSession(companyId: number): Promise<void> {
    try {
      await fs.rm(this.getSessionPath(companyId), {
        recursive: true,
        force: true,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao limpar sessão (company ${companyId}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async updateStatus(
    companyId: number,
    status: 'qr_pending' | 'connected' | 'disconnected',
    qr?: string,
  ): Promise<void> {
    await this.prisma.client.whatsappConfig.update({
      where: { companyId },
      data: {
        baileysStatus: status,
        ...(qr !== undefined && { baileysQr: qr }),
        ...(status === 'connected' && { baileysQr: null }),
      },
    });
  }

  async resetSession(companyId: number): Promise<void> {
    // reusa a lógica de disconnect (limpa timers, reconnectAttempts, encerra socket)
    await this.disconnect(companyId);

    // remove qualquer promise de connect em andamento para essa empresa
    this.connecting.delete(companyId);

    // apaga credenciais em disco — força novo QR na próxima conexão
    await this.clearSession(companyId);

    // zera status no banco, sem deixar QR antigo/inválido resgatável pelo polling
    await this.updateStatus(companyId, 'disconnected');
    await this.prisma.client.whatsappConfig.update({
      where: { companyId },
      data: { baileysQr: null },
    });
  }
}
