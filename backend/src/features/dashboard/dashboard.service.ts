import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AppointmentStatus } from '../../../generated/prisma/client.js';
import { DashboardStatsDto } from './dto/dashboard-stats.dto.js';
import { AppointmentTodayDto } from './dto/appointment-today.dto.js';
import { NextPatientDto } from './dto/next-patient.dto.js';
import { AppointmentsChartDto } from './dto/appointments-chart.dto.js';
import { ChatbotStatsDto } from './dto/chatbot-stats.dto.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private todayRange(): { gte: Date; lte: Date } {
    const now = new Date();
    const gte = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
    );
    const lte = new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      ),
    );
    return { gte, lte };
  }
  private monthRange(year: number, month: number): { gte: Date; lte: Date } {
    const gte = new Date(year, month, 1);
    const lte = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { gte, lte };
  }

  private currentMonthRange(): { gte: Date; lte: Date } {
    const now = new Date();
    return this.monthRange(now.getFullYear(), now.getMonth());
  }

  private prevMonthRange(): { gte: Date; lte: Date } {
    const now = new Date();
    return this.monthRange(now.getFullYear(), now.getMonth() - 1);
  }

  private calcTrend(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(companyId: number): Promise<DashboardStatsDto> {
    const today = this.todayRange();
    const currentMonth = this.currentMonthRange();
    const prevMonth = this.prevMonthRange();

    const activeStatuses: AppointmentStatus[] = [
      AppointmentStatus.confirmed,
      AppointmentStatus.pending,
      AppointmentStatus.checkin,
      AppointmentStatus.finished,
      AppointmentStatus.paid,
    ];

    const yesterday = {
      gte: new Date(today.gte.getTime() - 86400000),
      lte: new Date(today.lte.getTime() - 86400000),
    };

    const [
      totalConsultasHoje,
      totalConsultasOntem,
      payments,
      prevPayments,
      cancelledMonth,
      totalMonth,
      chatsAtivos,
    ] = await Promise.all([
      this.prisma.client.appointment.count({
        where: {
          companyId,
          date: today,
          status: { in: activeStatuses },
        },
      }),
      this.prisma.client.appointment.count({
        where: {
          companyId,
          date: yesterday,
          status: { in: activeStatuses },
        },
      }),
      this.prisma.client.payment.findMany({
        where: { date: currentMonth, appointment: { companyId } },
        select: { value: true },
      }),
      this.prisma.client.payment.findMany({
        where: { date: prevMonth, appointment: { companyId } },
        select: { value: true },
      }),
      this.prisma.client.appointment.count({
        where: {
          companyId,
          date: currentMonth,
          status: AppointmentStatus.cancelled,
        },
      }),
      this.prisma.client.appointment.count({
        where: {
          companyId,
          date: currentMonth,
          status: { in: [...activeStatuses, AppointmentStatus.cancelled] },
        },
      }),
      this.prisma.client.conversation.count({
        where: { companyId },
      }),
    ]);

    const receitaMensal = payments.reduce((sum, p) => sum + Number(p.value), 0);
    const receitaPrev = prevPayments.reduce(
      (sum, p) => sum + Number(p.value),
      0,
    );
    const taxaFaltas = totalMonth > 0 ? (cancelledMonth / totalMonth) * 100 : 0;

    return {
      totalConsultasHoje,
      totalConsultasHojeTrend: this.calcTrend(
        totalConsultasHoje,
        totalConsultasOntem,
      ),
      receitaMensal,
      receitaMensalTrend: this.calcTrend(receitaMensal, receitaPrev),
      taxaFaltas: Math.round(taxaFaltas * 10) / 10,
      taxaFaltasTrend: 0,
      chatsAtivos,
    };
  }

  // ── Appointments Today ─────────────────────────────────────────────────────

  async getAppointmentsToday(
    companyId: number,
    doctorId?: number,
  ): Promise<AppointmentTodayDto[]> {
    const today = this.todayRange();

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        companyId,
        date: today,
        status: {
          notIn: [AppointmentStatus.blocked, AppointmentStatus.external],
        },
        ...(doctorId ? { doctorId } : {}),
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        patient: { select: { name: true } },
        patientName: true,
        appointmentType: { select: { name: true } },
        doctor: { select: { id: true, name: true } },
        doctorName: true,
        doctorId: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return appointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      status: a.status,
      patient: {
        name: a.patient?.name ?? a.patientName ?? 'Paciente removido',
      },
      appointmentType: a.appointmentType,
      doctor: {
        id: a.doctor?.id ?? a.doctorId ?? 0,
        name: a.doctor?.name ?? a.doctorName ?? 'Médico removido',
      },
    }));
  }

  // ── Next Patient ───────────────────────────────────────────────────────────

  async getNextPatient(
    companyId: number,
    doctorId: number,
  ): Promise<NextPatientDto | null> {
    const today = this.todayRange();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const appointment = await this.prisma.client.appointment.findFirst({
      where: {
        doctorId,
        companyId,
        date: today,
        startTime: { gte: currentTime },
        status: {
          in: [
            AppointmentStatus.confirmed,
            AppointmentStatus.pending,
            AppointmentStatus.checkin,
          ],
        },
      },
      select: {
        startTime: true,
        patient: { select: { name: true } },
        patientName: true,
        appointmentType: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    if (!appointment) return null;

    return {
      startTime: appointment.startTime,
      patient: {
        name:
          appointment.patient?.name ??
          appointment.patientName ??
          'Paciente removido',
      },
      appointmentType: appointment.appointmentType,
    };
  }

  // ── Appointments Chart ─────────────────────────────────────────────────────

  async getAppointmentsChart(
    companyId: number,
    year: number,
  ): Promise<AppointmentsChartDto> {
    const months = Array.from({ length: 12 }, (_, i) => i);

    const results = await Promise.all(
      months.map((month) =>
        this.prisma.client.appointment.groupBy({
          by: ['status'],
          where: {
            companyId,
            date: this.monthRange(year, month),
            status: {
              notIn: [AppointmentStatus.blocked, AppointmentStatus.external],
            },
          },
          _count: { status: true },
        }),
      ),
    );

    const agendadosStatuses = [
      AppointmentStatus.confirmed,
      AppointmentStatus.pending,
      AppointmentStatus.checkin,
    ];
    const concluidosStatuses = [
      AppointmentStatus.finished,
      AppointmentStatus.paid,
    ];

    const count = (
      monthResult: { status: AppointmentStatus; _count: { status: number } }[],
      statuses: AppointmentStatus[],
    ) =>
      monthResult
        .filter((r) => statuses.includes(r.status))
        .reduce((sum, r) => sum + r._count.status, 0);

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    return {
      months: monthNames,
      data: {
        agendados: results.map((r) => count(r, agendadosStatuses)),
        concluidos: results.map((r) => count(r, concluidosStatuses)),
        cancelados: results.map((r) => count(r, [AppointmentStatus.cancelled])),
        reagendados: results.map((r) =>
          count(r, [AppointmentStatus.rescheduled]),
        ),
      },
    };
  }

  // ── Chatbot Stats ──────────────────────────────────────────────────────────

  async getChatbotStats(companyId: number): Promise<ChatbotStatsDto> {
    const [botInteractions, humanInteractions] = await Promise.all([
      this.prisma.client.conversation.count({
        where: { companyId, status: 'bot' },
      }),
      this.prisma.client.conversation.count({
        where: { companyId, status: { in: ['human', 'waiting'] } },
      }),
    ]);

    const total = botInteractions + humanInteractions;
    const percent = total > 0 ? Math.round((botInteractions / total) * 100) : 0;

    return { percent, botInteractions, humanInteractions };
  }
}
