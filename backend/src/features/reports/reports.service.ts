// reports.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ReportsFilterDto } from './dto/reports-filter.dto.js';
import { ReportsSummaryDto } from './dto/reports-summary.dto.js';
import { ReportsDoctorDto } from './dto/reports-doctor.dto.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private parseDateRange(filter: ReportsFilterDto): { gte: Date; lte: Date } {
    const gte = new Date(`${filter.dateFrom}T00:00:00.000Z`);
    const lte = new Date(`${filter.dateTo}T23:59:59.999Z`);
    if (isNaN(gte.getTime()) || isNaN(lte.getTime())) {
      throw new BadRequestException(
        'Datas inválidas. Use o formato YYYY-MM-DD',
      );
    }
    return { gte, lte };
  }

  private previousRange(filter: ReportsFilterDto): { gte: Date; lte: Date } {
    const from = new Date(`${filter.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${filter.dateTo}T23:59:59.999Z`);
    const diffMs = to.getTime() - from.getTime();
    return {
      gte: new Date(from.getTime() - diffMs - 1000),
      lte: new Date(from.getTime() - 1000),
    };
  }

  private lastSixMonthsRange(): { gte: Date; lte: Date } {
    const now = new Date();
    const gte = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const lte = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { gte, lte };
  }

  async getSummary(
    companyId: number,
    filter: ReportsFilterDto,
  ): Promise<ReportsSummaryDto> {
    const range = this.parseDateRange(filter);
    const prevRange = this.previousRange(filter);
    const sixMonths = this.lastSixMonthsRange();

    const [
      appointments,
      prevAppointments,
      payments,
      prevPayments,
      newPatients,
      prevNewPatients,
      specialtiesRaw,
      originRaw,
      chartRaw,
    ] = await Promise.all([
      // Total consultas
      this.prisma.client.appointment.count({
        where: {
          date: range,
          doctor: { companyId },
          status: { notIn: ['cancelled', 'blocked'] },
        },
      }),
      this.prisma.client.appointment.count({
        where: {
          date: prevRange,
          doctor: { companyId },
          status: { notIn: ['cancelled', 'blocked'] },
        },
      }),

      // Faturamento
      this.prisma.client.payment.findMany({
        where: { date: range, appointment: { doctor: { companyId } } },
        select: { value: true },
      }),
      this.prisma.client.payment.findMany({
        where: { date: prevRange, appointment: { doctor: { companyId } } },
        select: { value: true },
      }),

      // Novos pacientes
      this.prisma.client.patient.count({
        where: { companyId, memberSince: range },
      }),
      this.prisma.client.patient.count({
        where: { companyId, memberSince: prevRange },
      }),

      // Consultas por especialidade
      this.prisma.client.appointment.groupBy({
        by: ['specialty'],
        where: {
          date: range,
          doctor: { companyId },
          status: { notIn: ['cancelled', 'blocked'] },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Origem
      this.prisma.client.appointment.groupBy({
        by: ['origin'],
        where: {
          date: range,
          doctor: { companyId },
          status: { notIn: ['cancelled', 'blocked'] },
          origin: { not: null },
        },
        _count: { id: true },
      }),

      // Chart bars — últimos 6 meses
      this.prisma.client.payment.findMany({
        where: {
          date: sixMonths,
          appointment: { doctor: { companyId } },
        },
        select: { value: true, date: true },
      }),
    ]);

    // Stats calculados
    const totalConsultas = appointments;
    const prevConsultas = prevAppointments;
    const consultasTrend =
      prevConsultas > 0
        ? Math.round(((totalConsultas - prevConsultas) / prevConsultas) * 100)
        : 0;

    const totalFaturamento = payments.reduce((s, p) => s + Number(p.value), 0);
    const prevFaturamento = prevPayments.reduce(
      (s, p) => s + Number(p.value),
      0,
    );
    const faturamentoTrend =
      prevFaturamento > 0
        ? Math.round(
            ((totalFaturamento - prevFaturamento) / prevFaturamento) * 100,
          )
        : 0;

    const ticketMedio =
      totalConsultas > 0 ? totalFaturamento / totalConsultas : 0;
    const prevTicket = prevConsultas > 0 ? prevFaturamento / prevConsultas : 0;
    const ticketTrend =
      prevTicket > 0
        ? Math.round(((ticketMedio - prevTicket) / prevTicket) * 100)
        : 0;

    const novosPacientesTrend =
      prevNewPatients > 0
        ? Math.round(((newPatients - prevNewPatients) / prevNewPatients) * 100)
        : 0;

    // Specialties
    const maxCount = specialtiesRaw[0]?._count.id ?? 1;
    const specialties = specialtiesRaw.map((s) => ({
      name: s.specialty,
      count: s._count.id,
      max: maxCount,
    }));

    // Origin channels
    const originTotal = originRaw.reduce((s, o) => s + o._count.id, 0);
    const labelMap: Record<string, string> = {
      whatsapp: 'WhatsApp',
      telefone: 'Telefone',
      presencial: 'Presencial',
    };
    const colorMap: Record<string, string> = {
      whatsapp: 'var(--color-primary)',
      telefone: 'var(--color-info)',
      presencial: 'var(--color-success)',
    };
    const originChannels = originRaw
      .filter((o) => o.origin)
      .map((o) => ({
        label: labelMap[o.origin!] ?? o.origin!,
        percent:
          originTotal > 0 ? Math.round((o._count.id / originTotal) * 100) : 0,
        color: colorMap[o.origin!] ?? 'var(--color-text-muted)',
      }));

    // Chart bars — agrupa por mês
    const monthNames = [
      'JAN',
      'FEV',
      'MAR',
      'ABR',
      'MAI',
      'JUN',
      'JUL',
      'AGO',
      'SET',
      'OUT',
      'NOV',
      'DEZ',
    ];
    const barMap = new Map<string, number>();
    for (const p of chartRaw) {
      const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
      barMap.set(key, (barMap.get(key) ?? 0) + Number(p.value));
    }
    const chartBars = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return {
        month: monthNames[d.getMonth()],
        realized: barMap.get(key) ?? 0,
      };
    });

    return {
      stats: [
        {
          label: 'Total de Consultas',
          value: String(totalConsultas),
          trend: consultasTrend,
          accent: 'primary',
        },
        {
          label: 'Faturamento Total',
          value: totalFaturamento.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }),
          trend: faturamentoTrend,
          accent: 'success',
        },
        {
          label: 'Ticket Médio',
          value: ticketMedio.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }),
          trend: ticketTrend,
          accent: 'info',
        },
        {
          label: 'Novos Pacientes',
          value: String(newPatients),
          trend: novosPacientesTrend,
          accent: 'info',
        },
      ],
      chartBars,
      originChannels,
      originTotal,
      specialties,
    };
  }

  async getDoctors(
    companyId: number,
    filter: ReportsFilterDto,
  ): Promise<ReportsDoctorDto[]> {
    const range = this.parseDateRange(filter);

    const doctors = await this.prisma.client.doctor.findMany({
      where: { companyId, active: true },
      select: {
        id: true,
        name: true,
        specialty: true,
        appointments: {
          where: {
            date: range,
            status: { notIn: ['cancelled', 'blocked'] },
          },
          select: {
            rating: true,
            payments: { select: { value: true } },
          },
        },
      },
    });

    return doctors
      .map((d) => {
        const appointments = d.appointments.length;
        const revenue = d.appointments.reduce(
          (s, a) => s + a.payments.reduce((ps, p) => ps + Number(p.value), 0),
          0,
        );
        const ratingsRaw = d.appointments
          .map((a) => a.rating)
          .filter((r): r is NonNullable<typeof r> => r !== null);
        const rating =
          ratingsRaw.length > 0
            ? Math.round(
                (ratingsRaw.reduce((s, r) => s + Number(r), 0) /
                  ratingsRaw.length) *
                  10,
              ) / 10
            : null;

        const initials = d.name
          .split(' ')
          .filter((_, i, arr) => i === 0 || i === arr.length - 1)
          .map((w) => w[0])
          .join('')
          .toUpperCase();

        return {
          id: String(d.id),
          name: d.name,
          avatar: initials,
          specialty: d.specialty,
          appointments,
          revenue: revenue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }),
          rating,
        };
      })
      .sort((a, b) => b.appointments - a.appointments);
  }
}
