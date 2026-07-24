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
  WAMessageStatus,
} from '@whiskeysockets/baileys';
import P from 'pino';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { IWhatsappProvider } from '../interfaces/whatsapp-provider.interface.js';
import { NormalizedIncomingMessage } from '../interfaces/whatsapp-provider.interface.js';
import {
  BAILEYS_TEMPLATES,
  renderBaileysTemplateText,
} from './whatsapp-templates.map.js';

const pinoLogger = P({ level: 'silent' });

const SESSIONS_DIR =
  process.env.WHATSAPP_SESSIONS_DIR ?? path.resolve(process.cwd(), 'sessions');

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

@Injectable()
export class WhatssapBaileysProvider implements IWhatsappProvider {
  private readonly logger = new Logger(WhatssapBaileysProvider.name);
  private readonly sockets = new Map<number, WASocket>();

  private readonly connecting = new Map<number, Promise<void>>();

  private readonly reconnectAttempts = new Map<number, number>();
  private readonly reconnectTimers = new Map<number, NodeJS.Timeout>();

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

  private mapMessageStatus(
    waStatus: number,
  ): 'sent' | 'delivered' | 'read' | 'failed' | null {
    const status = Number(waStatus);
    const ERROR = Number(WAMessageStatus.ERROR);
    const SERVER_ACK = Number(WAMessageStatus.SERVER_ACK);
    const PENDING = Number(WAMessageStatus.PENDING);
    const DELIVERY_ACK = Number(WAMessageStatus.DELIVERY_ACK);
    const READ = Number(WAMessageStatus.READ);
    const PLAYED = Number(WAMessageStatus.PLAYED);

    if (status === ERROR) return 'failed';
    if (status === SERVER_ACK || status === PENDING) return 'sent';
    if (status === DELIVERY_ACK) return 'delivered';
    if (status === READ || status === PLAYED) return 'read';
    return null;
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
      this.handleConnectionUpdate(companyId, update).catch((err) => {
        this.logger.error(
          `Erro ao processar connection.update [company ${companyId}]: ${err instanceof Error ? err.message : err}`,
        );
      });
    });

    sock.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        const wamid = update.key?.id;
        const waStatus = update.update?.status;
        if (!wamid || waStatus === undefined || waStatus === null) continue;

        const status = this.mapMessageStatus(waStatus);
        if (!status) continue;

        this.events.emit('message-status', companyId, wamid, status);
      }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      const m = messages[0];
      if (!m.message) return;

      const remoteJid = m.key.remoteJid;
      if (!remoteJid) return;

      if (remoteJid === 'status@broadcast') return;

      const isGroup = remoteJid.endsWith('@g.us');
      const isLid = remoteJid.endsWith('@lid');

      const senderJid = isGroup
        ? (m.key.participantAlt ?? m.key.participant)
        : isLid
          ? m.key.remoteJidAlt
          : remoteJid;

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
        await this.clearSession(companyId);
      }
    }
  }

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

  async sendTemplate(
    companyId: number,
    to: string,
    templateName: string,
    components: object[],
  ): Promise<string | null> {
    const text = renderBaileysTemplateText(
      templateName,
      components as {
        type: string;
        parameters?: { type: string; parameter_name?: string; text?: string }[];
      }[],
    );
    return this.sendText(companyId, to, text);
  }

  getTemplates(): Promise<typeof BAILEYS_TEMPLATES> {
    return Promise.resolve(BAILEYS_TEMPLATES);
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
    await this.prisma.client.whatsappConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        provider: 'baileys',
        baileysStatus: status,
        ...(qr !== undefined && { baileysQr: qr }),
      },
      update: {
        baileysStatus: status,
        ...(qr !== undefined && { baileysQr: qr }),
        ...(status === 'connected' && { baileysQr: null }),
      },
    });
  }

  async resetSession(companyId: number): Promise<void> {
    await this.disconnect(companyId);

    this.connecting.delete(companyId);

    await this.clearSession(companyId);

    await this.updateStatus(companyId, 'disconnected');
    await this.prisma.client.whatsappConfig.update({
      where: { companyId },
      data: { baileysQr: null },
    });
  }
}
