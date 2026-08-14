import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { WhatssapCoreService } from '../whatssap/whatssap-core.service.js';
import { ChatService } from '../chat/chat.service.js';

@Injectable()
export class PatientReminderJob {
  private readonly logger = new Logger(PatientReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatssapCoreService,
    private readonly chat: ChatService,
  ) {}

  async triggerManually(): Promise<void> {
    this.logger.log(
      '[REMINDERS] Disparo manual — todas as consultas de amanhã, ignorando rules',
    );
    await this.processReminders({ companyId: null, offsetDays: 1 });
  }

  async triggerForRule(ruleId: number): Promise<void> {
    const rule = await this.prisma.client.reminderRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule || !rule.active) {
      this.logger.warn(`[REMINDERS] Rule ${ruleId} inexistente ou inativa`);
      return;
    }
    if (rule.target !== 'patient') {
      this.logger.warn(`[REMINDERS] Rule ${ruleId} não é do tipo 'patient'`);
      return;
    }

    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId: rule.companyId },
      select: { autoReminder: true },
    });

    if (!config?.autoReminder) {
      this.logger.log(
        `[REMINDERS] Rule ${ruleId} ignorada — autoReminder desativado (company ${rule.companyId})`,
      );
      return;
    }

    this.logger.log(
      `[REMINDERS] Rule ${ruleId} disparada — company ${rule.companyId} | offsetDays ${rule.offsetDays}`,
    );
    await this.processReminders(rule);
  }

  private async processReminders(rule: {
    companyId: number | null;
    offsetDays: number;
  }): Promise<void> {
    const now = new Date();

    const targetStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + rule.offsetDays,
        0,
        0,
        0,
        0,
      ),
    );
    const targetEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + rule.offsetDays,
        23,
        59,
        59,
        999,
      ),
    );

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        date: { gte: targetStart, lte: targetEnd },
        status: { in: ['pending', 'confirmed'] },
        patient: {
          whatsappActive: true,
          ...(rule.companyId ? { companyId: rule.companyId } : {}),
        },
      },
      include: {
        patient: { select: { name: true, phone: true, companyId: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointments.length) {
      this.logger.log(
        `[REMINDERS] company ${rule.companyId} — nenhuma consulta para offsetDays ${rule.offsetDays}`,
      );
      return;
    }

    let success = 0;
    let failures = 0;

    for (const appointment of appointments) {
      if (!appointment.patient || !appointment.doctor) continue;

      const phone = appointment.patient.phone;
      if (!phone) continue;

      const dateFormatted = appointment.date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      });

      const resolvedText = `Olá ${appointment.patient.name}, lembrete da sua consulta com ${appointment.doctor.name} em ${dateFormatted} às ${appointment.startTime}.`;

      try {
        const conversation = await this.chat.findOrCreateConversationByPhone(
          appointment.patient.companyId,
          phone,
          appointment.patientId,
        );

        await this.whatsapp.sendTemplateToConversation(
          appointment.patient.companyId,
          conversation.id,
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
          resolvedText,
        );

        success++;
      } catch (err) {
        failures++;
        this.logger.error(
          `[REMINDERS] Falha appointment ${appointment.id}`,
          err,
        );
      }
    }

    this.logger.log(
      `[REMINDERS] company ${rule.companyId} offsetDays ${rule.offsetDays} — enviados: ${success} | falhas: ${failures}`,
    );
  }
}
