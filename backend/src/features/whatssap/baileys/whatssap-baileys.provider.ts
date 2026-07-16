/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// baileys/whatssap-baileys.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as path from 'path';
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

@Injectable()
export class WhatssapBaileysProvider implements IWhatsappProvider {
  private readonly logger = new Logger(WhatssapBaileysProvider.name);
  private readonly sockets = new Map<number, WASocket>();

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

    const sessionPath = path.join('./sessions', String(companyId));
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
      },
      printQRInTerminal: false,
      logger: pinoLogger,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        await this.updateStatus(companyId, 'qr_pending', qr);
        this.events.emit('status', companyId, 'qr_pending', qr);
      }

      if (connection === 'open') {
        await this.updateStatus(companyId, 'connected');
        this.events.emit('status', companyId, 'connected');
      }

      if (connection === 'close') {
        this.sockets.delete(companyId);

        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        await this.updateStatus(companyId, 'disconnected');
        this.events.emit('status', companyId, 'disconnected');

        if (shouldReconnect) {
          this.logger.warn(
            `Baileys desconectado (company ${companyId}), reconectando... [code ${statusCode}]`,
          );
          await this.connect(companyId);
        } else {
          this.logger.warn(
            `Baileys deslogado (company ${companyId}) — necessário novo QR`,
          );
        }
      }
    });

    sock.ev.on('messages.upsert', ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;

      const phone = m.key.remoteJid?.split('@')[0];
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

  async disconnect(companyId: number): Promise<void> {
    const sock = this.sockets.get(companyId);
    if (!sock) return;

    sock.end(undefined);
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

  // baileys/whatssap-baileys.provider.ts — MÉTODO A ADICIONAR

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
}
