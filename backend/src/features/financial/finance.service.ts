import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { FinanceSummaryDto } from './dto/finance-summary.dto.js';
import { FinanceExpenseDto } from './dto/finance-expense.dto.js';
import { FinanceTransactionDto } from './dto/finance-transaction.dto.js';
import {
  ProfessionalRevenueDto,
  ProfessionalRevenueAppointmentDto,
} from './dto/professional-revenue.dto.js';
import { CashClosingRowDto } from './dto/cash-closing-row.dto.js';
import { FinanceFilterDto } from './dto/finance-filter.dto.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpenseWithRegisteredBy } from './entities/financial.entity.js';

const TZ = 'America/Sao_Paulo';
const TZ_OFFSET = '-03:00';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private toLocalDateString(date: Date): string {
    return date
      .toLocaleDateString('pt-BR', { timeZone: TZ })
      .split('/')
      .reverse()
      .join('-');
  }

  private parseDateRange(filter: FinanceFilterDto): { gte: Date; lte: Date } {
    const gte = new Date(`${filter.dateFrom}T00:00:00.000${TZ_OFFSET}`);
    const lte = new Date(`${filter.dateTo}T23:59:59.999${TZ_OFFSET}`);
    if (isNaN(gte.getTime()) || isNaN(lte.getTime())) {
      throw new BadRequestException(
        'Datas inválidas. Use o formato YYYY-MM-DD',
      );
    }
    return { gte, lte };
  }

  private previousRange(filter: FinanceFilterDto): { gte: Date; lte: Date } {
    const from = new Date(`${filter.dateFrom}T00:00:00.000${TZ_OFFSET}`);
    const to = new Date(`${filter.dateTo}T23:59:59.999${TZ_OFFSET}`);
    const diffMs = to.getTime() - from.getTime();

    const lte = new Date(from.getTime() - 1);
    const gte = new Date(lte.getTime() - diffMs);

    return { gte, lte };
  }

  private toStartOfDay(date: string): Date {
    return new Date(`${date}T00:00:00.000${TZ_OFFSET}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  async getSummary(
    companyId: number,
    filter: FinanceFilterDto,
  ): Promise<FinanceSummaryDto> {
    const range = this.parseDateRange(filter);
    const prevRange = this.previousRange(filter);

    const [payments, prevPayments, expenses] = await Promise.all([
      this.prisma.client.payment.findMany({
        where: { date: range, appointment: { doctor: { companyId } } },
        select: { value: true },
      }),
      this.prisma.client.payment.findMany({
        where: { date: prevRange, appointment: { doctor: { companyId } } },
        select: { value: true },
      }),
      this.prisma.client.expense.findMany({
        where: { companyId, date: range, status: 'pago' },
        select: { value: true },
      }),
    ]);

    const totalEntradas = payments.reduce((sum, p) => sum + Number(p.value), 0);
    const prevEntradas = prevPayments.reduce(
      (sum, p) => sum + Number(p.value),
      0,
    );
    const entradasChange =
      prevEntradas > 0
        ? Math.round(((totalEntradas - prevEntradas) / prevEntradas) * 100)
        : 0;

    return {
      totalEntradas,
      entradasChange,
      totalSaidas: expenses.reduce((sum, e) => sum + Number(e.value), 0),
      saidasCount: expenses.length,
    };
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  async getExpenses(
    companyId: number,
    filter: FinanceFilterDto,
  ): Promise<FinanceExpenseDto[]> {
    const range = this.parseDateRange(filter);

    const expenses = await this.prisma.client.expense.findMany({
      where: { companyId, date: range },
      include: {
        registeredBy: { select: { id: true, username: true } },
      },
      orderBy: { date: 'desc' },
    });

    return expenses.map((e) => ({
      id: String(e.id),
      description: e.description,
      category: e.category,
      registeredById: e.registeredById,
      registeredByName: e.registeredBy.username,
      value: Number(e.value),
      date: this.toLocalDateString(e.date),
      status: e.status,
    }));
  }

  // ── Transactions ───────────────────────────────────────────────────────────

  async getTransactions(
    companyId: number,
    filter: FinanceFilterDto,
  ): Promise<FinanceTransactionDto[]> {
    const range = this.parseDateRange(filter);

    const [payments, expenses] = await Promise.all([
      this.prisma.client.payment.findMany({
        where: { date: range, appointment: { doctor: { companyId } } },
        include: {
          entries: { select: { method: true } },
          registeredBy: { select: { username: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.client.expense.findMany({
        where: { companyId, date: range, status: 'pago' },
        include: {
          registeredBy: { select: { username: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const fromPayments: FinanceTransactionDto[] = payments.map((p) => ({
      id: `payment-${p.id}`,
      type: 'entrada' as const,
      date: this.toLocalDateString(p.date),
      time: p.date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TZ,
      }),
      patient: p.patient ?? '',
      doctor: p.doctor ?? '',
      registeredBy: p.registeredBy.username,
      value: Number(p.value),
      methods: [...new Set(p.entries.map((e) => e.method))],
    }));

    const fromExpenses: FinanceTransactionDto[] = expenses.map((e) => ({
      id: `expense-${e.id}`,
      type: 'saida' as const,
      date: this.toLocalDateString(e.date),
      time: e.date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TZ,
      }),
      patient: e.description,
      doctor: '',
      registeredBy: e.registeredBy.username,
      value: Number(e.value),
      methods: [],
    }));

    return [...fromPayments, ...fromExpenses].sort(
      (a, b) =>
        new Date(`${b.date}T${b.time}`).getTime() -
        new Date(`${a.date}T${a.time}`).getTime(),
    );
  }

  // ── Professional Revenues ──────────────────────────────────────────────────

  async getProfessionalRevenues(
    companyId: number,
    filter: FinanceFilterDto,
  ): Promise<ProfessionalRevenueDto[]> {
    const range = this.parseDateRange(filter);

    const payments = await this.prisma.client.payment.findMany({
      where: { date: range, appointment: { doctor: { companyId } } },
      select: {
        date: true,
        value: true,
        doctorEarnings: true,
        discount: true,
        appointment: {
          select: {
            date: true,
            startTime: true,
            specialty: true,
            appointmentType: { select: { name: true } },
            patient: { select: { name: true } },
            doctor: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    const map = new Map<
      number,
      {
        id: number;
        name: string;
        avatarUrl: string | null;
        value: number;
        appointments: ProfessionalRevenueAppointmentDto[];
      }
    >();

    for (const p of payments) {
      const doctor = p.appointment.doctor;
      const appointment: ProfessionalRevenueAppointmentDto = {
        date: this.toLocalDateString(p.appointment.date),
        startTime: p.appointment.startTime,
        specialty: p.appointment.specialty,
        appointmentType: p.appointment.appointmentType?.name ?? null,
        patientName: p.appointment.patient.name,
        paymentValue: Number(p.value),
        doctorEarnings: Number(p.doctorEarnings),
        discount: Number(p.discount),
        paymentDate: this.toLocalDateString(p.date),
      };

      const existing = map.get(doctor.id);
      if (existing) {
        existing.value += Number(p.doctorEarnings);
        existing.appointments.push(appointment);
      } else {
        map.set(doctor.id, {
          id: doctor.id,
          name: doctor.name,
          avatarUrl: doctor.avatarUrl,
          value: Number(p.doctorEarnings),
          appointments: [appointment],
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .map((d) => ({
        id: String(d.id),
        name: d.name,
        avatar: d.avatarUrl ?? '👤',
        value: d.value,
        appointments: d.appointments,
      }));
  }

  // ── Cash Closing ───────────────────────────────────────────────────────────

  async getCashClosing(
    companyId: number,
    filter: FinanceFilterDto,
  ): Promise<CashClosingRowDto[]> {
    const range = this.parseDateRange(filter);

    const entries = await this.prisma.client.paymentEntry.findMany({
      where: {
        payment: {
          date: range,
          appointment: { doctor: { companyId } },
        },
      },
      select: {
        method: true,
        amount: true,
        change: true,
        payment: {
          select: {
            registeredBy: { select: { id: true, username: true } },
          },
        },
      },
    });

    const map = new Map<number, CashClosingRowDto>();

    for (const entry of entries) {
      const user = entry.payment.registeredBy;
      const net = Number(entry.amount) - Number(entry.change);

      if (!map.has(user.id)) {
        map.set(user.id, {
          operator: user.username,
          pix: 0,
          dinheiro: 0,
          cartao: 0,
          convenio: 0,
        });
      }

      const row = map.get(user.id)!;
      row[entry.method] += net;
    }

    return Array.from(map.values());
  }

  // ── Create / Update Expense ────────────────────────────────────────────────

  private mapExpense(expense: ExpenseWithRegisteredBy): FinanceExpenseDto {
    return {
      id: String(expense.id),
      description: expense.description,
      category: expense.category,
      registeredById: expense.registeredById,
      registeredByName: expense.registeredBy.username,
      value: Number(expense.value),
      date: this.toLocalDateString(expense.date),
      status: expense.status,
    };
  }

  async createExpense(
    companyId: number,
    registeredById: number,
    dto: CreateExpenseDto,
  ): Promise<FinanceExpenseDto> {
    const expense = await this.prisma.client.expense.create({
      data: {
        companyId,
        registeredById,
        description: dto.description,
        category: dto.category,
        value: dto.value,
        date: this.toStartOfDay(dto.date),
        status: dto.status,
      },
      include: {
        registeredBy: { select: { id: true, username: true } },
      },
    });

    return this.mapExpense(expense);
  }

  async updateExpense(
    id: number,
    companyId: number,
    dto: UpdateExpenseDto,
  ): Promise<FinanceExpenseDto> {
    const existing = await this.prisma.client.expense.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Despesa não encontrada');

    const expense = await this.prisma.client.expense.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.date !== undefined && { date: this.toStartOfDay(dto.date) }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        registeredBy: { select: { id: true, username: true } },
      },
    });

    return this.mapExpense(expense);
  }
}
