import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service.js';
import { WhatssapService } from './whatssap.service.js';

@Injectable()
export class ReminderJob {
  private readonly logger = new Logger(ReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatssapService,
  ) {}

  @Cron('0 9 * * *', { name: 'appointment-reminders' })
  async sendReminders(): Promise<void> {
    this.logger.log('[REMINDERS] Iniciando envio de lembretes (9h)');
    await this.processReminders('primary');
  }

  @Cron('30 9 * * *', { name: 'appointment-reminders-retry' })
  async retryReminders(): Promise<void> {
    this.logger.log('[REMINDERS] Iniciando retry de lembretes (9h30)');
    await this.processReminders('retry');
  }

  async triggerManually(): Promise<void> {
    this.logger.log('[REMINDERS] Disparado manualmente');
    await this.processReminders('primary');
  }

  private async processReminders(mode: 'primary' | 'retry'): Promise<void> {
    const now = new Date();

    const tomorrowStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
    const tomorrowEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        23,
        59,
        59,
        999,
      ),
    );

    this.logger.log(
      `[REMINDERS:${mode}] Buscando consultas entre ${tomorrowStart.toISOString()} e ${tomorrowEnd.toISOString()}`,
    );

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        date: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { in: ['pending', 'confirmed'] },
        reminderSent: false,
        patient: { whatsappActive: true },
      },
      include: {
        patient: { select: { name: true, phone: true, companyId: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointments.length) {
      this.logger.log(
        `[REMINDERS:${mode}] Nenhuma consulta encontrada para lembrete`,
      );
      return;
    }

    this.logger.log(
      `[REMINDERS:${mode}] ${appointments.length} consulta(s) encontrada(s)`,
    );

    const companyIds = [
      ...new Set(appointments.map((a) => a.patient.companyId)),
    ];

    const configs = await this.prisma.client.whatsappConfig.findMany({
      where: {
        companyId: { in: companyIds },
        autoReminder: true,
        accessToken: { not: null },
        phoneNumberId: { not: null },
      },
      select: { companyId: true, accessToken: true, phoneNumberId: true },
    });

    this.logger.log(
      `[REMINDERS:${mode}] ${configs.length} empresa(s) com configuração WhatsApp ativa`,
    );

    const configMap = new Map(configs.map((c) => [c.companyId, c]));

    const successIds: number[] = [];
    const failureIds: number[] = [];
    const skippedIds: number[] = [];

    for (const appointment of appointments) {
      const config = configMap.get(appointment.patient.companyId);

      if (!config?.accessToken || !config?.phoneNumberId) {
        this.logger.warn(
          `[REMINDERS:${mode}] Appointment ${appointment.id} ignorado — empresa ${appointment.patient.companyId} sem config WhatsApp`,
        );
        skippedIds.push(appointment.id);
        continue;
      }

      const phone = appointment.patient.phone;
      if (!phone) {
        this.logger.warn(
          `[REMINDERS:${mode}] Appointment ${appointment.id} ignorado — paciente sem telefone`,
        );
        skippedIds.push(appointment.id);
        continue;
      }

      const dateFormatted = appointment.date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      });

      try {
        await this.whatsapp.sendTemplate(
          phone,
          'lembrete_consulta',
          [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: appointment.patient.name },
                { type: 'text', text: appointment.doctor.name },
                { type: 'text', text: dateFormatted },
                { type: 'text', text: appointment.startTime },
              ],
            },
          ],
          config.accessToken,
          config.phoneNumberId,
        );

        successIds.push(appointment.id);
        this.logger.log(
          `[REMINDERS:${mode}] Lembrete enviado — appointment ${appointment.id} | paciente: ${appointment.patient.name} | ${dateFormatted} ${appointment.startTime}`,
        );

        const updated = await this.prisma.client.conversation.updateMany({
          where: {
            phone: { endsWith: phone.slice(-8) },
            companyId: appointment.patient.companyId,
          },
          data: { botStep: 'AWAITING_REMINDER_REPLY' },
        });

        if (updated.count > 0) {
          this.logger.log(
            `[REMINDERS:${mode}] botStep atualizado para AWAITING_REMINDER_REPLY — appointment ${appointment.id}`,
          );
        } else {
          this.logger.warn(
            `[REMINDERS:${mode}] Nenhuma conversa encontrada para atualizar botStep — appointment ${appointment.id} | phone: ${phone}`,
          );
        }
      } catch (err) {
        failureIds.push(appointment.id);
        this.logger.error(
          `[REMINDERS:${mode}] Falha ao enviar lembrete — appointment ${appointment.id} | paciente: ${appointment.patient.name}`,
          err,
        );
      }
    }

    if (successIds.length > 0) {
      await this.prisma.client.appointment.updateMany({
        where: { id: { in: successIds } },
        data: { reminderSent: true },
      });
      this.logger.log(
        `[REMINDERS:${mode}] ${successIds.length} lembrete(s) marcado(s) como enviado`,
      );
    }

    this.logger.log(
      `[REMINDERS:${mode}] Concluído — enviados: ${successIds.length} | falhas: ${failureIds.length} | ignorados: ${skippedIds.length}`,
    );

    if (failureIds.length > 0) {
      this.logger.warn(
        `[REMINDERS:${mode}] IDs com falha (serão retentados${mode === 'primary' ? ' às 9h30' : ' na próxima execução'}): ${failureIds.join(', ')}`,
      );
    }
  }
}
