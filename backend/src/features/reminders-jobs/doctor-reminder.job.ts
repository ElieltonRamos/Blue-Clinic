import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { WhatssapCoreService } from '../whatssap/whatssap-core.service.js';

@Injectable()
export class DoctorReminderJob {
  private readonly logger = new Logger(DoctorReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatssapCoreService,
  ) {}

  async triggerManually(): Promise<void> {
    this.logger.log(
      '[DOCTOR_REMINDERS] Disparo manual — todas as consultas de amanhã, ignorando rules',
    );
    await this.process({ companyId: null, offsetDays: 1 });
  }

  async triggerForRule(ruleId: number): Promise<void> {
    const rule = await this.prisma.client.reminderRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule || !rule.active) {
      this.logger.warn(
        `[DOCTOR_REMINDERS] Rule ${ruleId} inexistente ou inativa`,
      );
      return;
    }
    if (rule.target !== 'doctor') {
      this.logger.warn(
        `[DOCTOR_REMINDERS] Rule ${ruleId} não é do tipo 'doctor'`,
      );
      return;
    }

    this.logger.log(
      `[DOCTOR_REMINDERS] Rule ${ruleId} disparada — company ${rule.companyId} | offsetDays ${rule.offsetDays}`,
    );
    await this.process(rule);
  }

  private async process(rule: {
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
        ...(rule.companyId ? { doctor: { companyId: rule.companyId } } : {}),
      },
      include: {
        patient: { select: { name: true } },
        doctor: {
          select: {
            id: true,
            name: true,
            companyId: true,
            user: { select: { phone: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    if (!appointments.length) {
      this.logger.log(
        `[DOCTOR_REMINDERS] company ${rule.companyId} — nenhuma consulta para offsetDays ${rule.offsetDays}`,
      );
      return;
    }

    const byDoctor = new Map<number, typeof appointments>();
    for (const appt of appointments) {
      if (!appt.doctorId || !appt.doctor) continue;
      const list = byDoctor.get(appt.doctorId) ?? [];
      list.push(appt);
      byDoctor.set(appt.doctorId, list);
    }

    for (const [doctorId, appts] of byDoctor) {
      const doctor = appts[0].doctor!;
      const phone = doctor.user?.phone;

      if (!phone) {
        this.logger.warn(
          `[DOCTOR_REMINDERS] Médico ${doctorId} sem telefone cadastrado`,
        );
        continue;
      }

      const dateFormatted = appts[0].date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      });
      const patientList = appts
        .map((a) => `${a.startTime} - ${a.patient?.name ?? 'Deletado'}`)
        .join('\n');

      try {
        await this.whatsapp.sendTemplateDirect(
          doctor.companyId,
          phone,
          'resumo_agenda_medico',
          [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  parameter_name: 'nome_medico',
                  text: doctor.name,
                },
                {
                  type: 'text',
                  parameter_name: 'data_agenda',
                  text: dateFormatted,
                },
                {
                  type: 'text',
                  parameter_name: 'qtd_atendimentos',
                  text: String(appts.length),
                },
                {
                  type: 'text',
                  parameter_name: 'lista_atendimentos',
                  text: patientList,
                },
              ],
            },
          ],
        );
        this.logger.log(
          `[DOCTOR_REMINDERS] Enviado para médico ${doctorId} (${appts.length} atendimentos)`,
        );
      } catch (err) {
        this.logger.error(
          `[DOCTOR_REMINDERS] Falha ao enviar para médico ${doctorId}`,
          err,
        );
      }
    }
  }
}
