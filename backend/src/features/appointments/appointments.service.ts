import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AppointmentStatus, Prisma } from '../../../generated/prisma/client.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { AppointmentFiltersDto } from './dto/appointment-filters.dto.js';
import { AppointmentResponseDto } from './dto/appointment-response.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentResponseDto } from './dto/payment-response.dto.js';
import { BlockedSlotResponseDto } from './dto/blocked-slot-response.dto.js';
import { AutoConfirmationDto } from './dto/auto-confirmation.dto.js';
import {
  AvailableSlotsQueryDto,
  SlotDto,
  SlotStatus,
} from './dto/available-slots.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // ── Appointments ───────────────────────────────────────────────────────────

  async findAll(
    companyId: number,
    filters: AppointmentFiltersDto,
  ): Promise<AppointmentResponseDto[]> {
    const where: Prisma.AppointmentWhereInput = {
      doctor: { companyId },
    };

    if (filters.month) {
      // espera 'YYYY-MM'
      const [year, month] = filters.month.split('-').map(Number);
      if (!year || !month)
        throw new BadRequestException('Formato de mês inválido. Use YYYY-MM');
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    if (filters.doctorId) {
      where.doctorId = filters.doctorId;
    }

    if (filters.status) {
      where.status = filters.status as AppointmentStatus;
    }

    const appointments = await this.prisma.client.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return appointments.map((a) => new AppointmentResponseDto(a));
  }

  async findOne(
    id: number,
    companyId: number,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, doctor: { companyId } },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return new AppointmentResponseDto(appointment);
  }

  async create(
    companyId: number,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const doctor = await this.prisma.client.doctor.findFirst({
      where: { id: dto.doctorId, companyId, active: true },
    });
    if (!doctor) throw new NotFoundException('Médico não encontrado');

    const patient = await this.prisma.client.patient.findFirst({
      where: { id: dto.patientId, companyId },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    const appointment = await this.prisma.client.appointment.create({
      data: {
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        specialty: dto.specialty ?? doctor.specialty,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: 'pending',
        responsible: dto.responsible,
        notes: dto.notes,
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
    });

    return new AppointmentResponseDto(appointment);
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    await this.findOne(id, companyId);

    const data: Prisma.AppointmentUpdateInput = {};
    if (dto.status) data.status = dto.status as AppointmentStatus;
    if (dto.startTime) data.startTime = dto.startTime;
    if (dto.endTime) data.endTime = dto.endTime;
    if (dto.date) data.date = new Date(dto.date);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.responsible !== undefined) data.responsible = dto.responsible;

    const appointment = await this.prisma.client.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
    });

    return new AppointmentResponseDto(appointment);
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  async createPayment(
    appointmentId: number,
    companyId: number,
    dto: CreatePaymentDto,
    registeredById: number,
  ): Promise<PaymentResponseDto> {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id: appointmentId, doctor: { companyId } },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    if (appointment.status === 'paid') {
      throw new BadRequestException('Agendamento já foi pago');
    }
    if (appointment.status !== 'checkin') {
      throw new BadRequestException(
        'Agendamento precisa estar em check-in para receber pagamento',
      );
    }

    const total = dto.entries.reduce((sum, e) => sum + Number(e.amount), 0);
    if (total <= 0)
      throw new BadRequestException('Valor total deve ser maior que zero');

    const payment = await this.prisma.client.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.payment.create({
          data: {
            appointmentId,
            date: new Date(),
            patient: appointment.patient.name,
            doctor: appointment.doctor.name,
            registeredById,
            value: total,
            entries: {
              create: dto.entries.map((e) => ({
                method: e.method,
                amount: e.amount,
                change: e.change ?? 0,
              })),
            },
          },
          include: { entries: true },
        });

        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'paid' },
        });

        return created;
      },
    );

    return new PaymentResponseDto(payment);
  }

  // ── Blocked Slots ──────────────────────────────────────────────────────────

  async findBlockedSlots(
    companyId: number,
    doctorId?: number,
  ): Promise<BlockedSlotResponseDto[]> {
    const slots = await this.prisma.client.blockedSlot.findMany({
      where: {
        companyId,
        ...(doctorId ? { doctorId } : {}),
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return slots.map((s) => new BlockedSlotResponseDto(s));
  }

  // ── Auto-confirmation stats ────────────────────────────────────────────────

  async getAutoConfirmation(
    companyId: number,
    month: string,
  ): Promise<AutoConfirmationDto> {
    const [year, m] = month.split('-').map(Number);
    if (!year || !m)
      throw new BadRequestException('Formato de mês inválido. Use YYYY-MM');

    const dateFilter = {
      gte: new Date(year, m - 1, 1),
      lt: new Date(year, m, 1),
    };

    const [confirmed, total] = await Promise.all([
      this.prisma.client.appointment.count({
        where: { doctor: { companyId }, date: dateFilter, status: 'confirmed' },
      }),
      this.prisma.client.appointment.count({
        where: { doctor: { companyId }, date: dateFilter },
      }),
    ]);

    return { confirmed, total };
  }

  async getAvailableSlots(
    companyId: number,
    query: AvailableSlotsQueryDto,
  ): Promise<SlotDto[]> {
    const { doctorId, date, appointmentTypeId } = query;

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // 1. Schedule do médico para o dia
    const schedule = await this.prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });

    if (!schedule || !schedule.active) {
      return []; // médico não atende nesse dia
    }

    // 2. Duração do tipo de consulta
    const appointmentType = await this.prisma.client.appointmentType.findFirst({
      where: { id: appointmentTypeId, active: true },
    });
    if (!appointmentType)
      throw new NotFoundException('Tipo de consulta não encontrado');

    const duration = appointmentType.duration; // minutos

    // 3. Gera todos os slots possíveis
    const slots = this.generateSlots(
      schedule.startTime,
      schedule.endTime,
      duration,
    );

    // 4. Agendamentos existentes no dia (exceto cancelled)
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        doctorId,
        date: { gte: dayStart, lt: dayEnd },
        status: { not: 'cancelled' },
      },
      include: { patient: { select: { name: true } } },
    });

    // 5. Bloqueios do médico para o dia
    const blockedSlots = await this.prisma.client.blockedSlot.findMany({
      where: {
        doctorId,
        OR: [
          // bloqueio pontual no dia
          { date: { gte: dayStart, lt: dayEnd }, recurrence: 'none' },
          // bloqueio semanal no mesmo dayOfWeek
          { recurrence: 'weekly', date: null },
          // bloqueio diário
          { recurrence: 'daily' },
        ],
      },
    });

    // filtra weekly pelo dayOfWeek correto (Prisma não filtra isso nativamente)
    const effectiveBlocks = blockedSlots.filter((b) => {
      if (b.recurrence === 'none' || b.recurrence === 'daily') return true;
      if (b.recurrence === 'weekly') {
        // usa a data de criação como referência do dia da semana
        return b.date ? new Date(b.date).getDay() === dayOfWeek : false;
      }
      return false;
    });

    // 6. Mapeia cada slot gerado para seu status
    return slots.map((slot) => {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);

      // verifica conflito com agendamento
      const bookedBy = appointments.find((a) => {
        const aStart = this.timeToMinutes(a.startTime);
        const aEnd = this.timeToMinutes(a.endTime);
        return slotStart < aEnd && slotEnd > aStart; // sobreposição de intervalo
      });

      if (bookedBy) {
        return {
          ...slot,
          status: 'booked' as SlotStatus,
          reason: bookedBy.patient.name,
        };
      }

      // verifica conflito com bloqueio
      const blockedBy = effectiveBlocks.find((b) => {
        const bStart = this.timeToMinutes(b.startTime);
        const bEnd = this.timeToMinutes(b.endTime);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (blockedBy) {
        return {
          ...slot,
          status: 'blocked' as SlotStatus,
          reason: blockedBy.label,
        };
      }

      return { ...slot, status: 'available' as SlotStatus };
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private generateSlots(
    startTime: string,
    endTime: string,
    duration: number,
  ): Pick<SlotDto, 'startTime' | 'endTime'>[] {
    const slots: Pick<SlotDto, 'startTime' | 'endTime'>[] = [];
    let current = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    while (current + duration <= end) {
      slots.push({
        startTime: this.minutesToTime(current),
        endTime: this.minutesToTime(current + duration),
      });
      current += duration;
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
