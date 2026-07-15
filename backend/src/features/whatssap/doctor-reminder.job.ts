import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service.js';
import { WhatssapService } from './whatssap.service.js';

@Injectable()
export class DoctorReminderJob {
  private readonly logger = new Logger(DoctorReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatssapService,
  ) {}

  @Cron('0 18 * * *', { name: 'doctor-schedule-reminders' })
  async sendDoctorReminders(): Promise<void> {
    this.logger.log('[DOCTOR_REMINDERS] Iniciando (18h)');
    await this.process();
  }

  async triggerManually(): Promise<void> {
    await this.process();
  }

  private async process(): Promise<void> {
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

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        date: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { in: ['pending', 'confirmed'] },
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
      this.logger.log('[DOCTOR_REMINDERS] Nenhuma consulta encontrada');
      return;
    }

    const byDoctor = new Map<number, typeof appointments>();
    for (const appt of appointments) {
      const list = byDoctor.get(appt.doctorId) ?? [];
      list.push(appt);
      byDoctor.set(appt.doctorId, list);
    }

    const companyIds = [
      ...new Set(appointments.map((a) => a.doctor.companyId)),
    ];
    const configs = await this.prisma.client.whatsappConfig.findMany({
      where: {
        companyId: { in: companyIds },
        accessToken: { not: null },
        phoneNumberId: { not: null },
      },
      select: { companyId: true, accessToken: true, phoneNumberId: true },
    });
    const configMap = new Map(configs.map((c) => [c.companyId, c]));

    for (const [doctorId, appts] of byDoctor) {
      const doctor = appts[0].doctor;
      const phone = doctor.user?.phone;
      const config = configMap.get(doctor.companyId);

      if (!phone) {
        this.logger.warn(
          `[DOCTOR_REMINDERS] Médico ${doctorId} sem telefone cadastrado`,
        );
        continue;
      }
      if (!config?.accessToken || !config?.phoneNumberId) {
        this.logger.warn(
          `[DOCTOR_REMINDERS] Empresa ${doctor.companyId} sem config WhatsApp`,
        );
        continue;
      }

      const dateFormatted = appts[0].date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      });
      const patientList = appts
        .map((a) => `${a.startTime} - ${a.patient.name}`)
        .join('\n');

      try {
        await this.whatsapp.sendTemplate(
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
          config.accessToken,
          config.phoneNumberId,
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
