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
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    const dayAfter = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
    );

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        date: { gte: tomorrow, lt: dayAfter },
        status: { in: ['pending', 'confirmed'] },
        reminderSent: false,
        patient: { whatsappActive: true },
      },
      include: {
        patient: { select: { name: true, phone: true, companyId: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointments.length) return;

    // Agrupa por companyId para buscar config uma vez por empresa
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

    const configMap = new Map(configs.map((c) => [c.companyId, c]));

    for (const appointment of appointments) {
      const config = configMap.get(appointment.patient.companyId);
      if (!config?.accessToken || !config?.phoneNumberId) continue;

      const phone = appointment.patient.phone;
      if (!phone) continue;

      const dateFormatted = tomorrow.toLocaleDateString('pt-BR', {
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

        await this.prisma.client.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true },
        });

        this.logger.log(`Lembrete enviado: appointment ${appointment.id}`);
      } catch (err) {
        this.logger.error(
          `Falha ao enviar lembrete para appointment ${appointment.id}`,
          err,
        );
      }
    }
  }
}
