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
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto.js';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto.js';
import { AutoConfirmationDto } from './dto/auto-confirmation.dto.js';
import {
  AvailableSlotsQueryDto,
  SlotDto,
  SlotStatus,
} from './dto/available-slots.dto.js';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto.js';

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
      const [year, month] = filters.month.split('-').map(Number);
      if (!year || !month)
        throw new BadRequestException('Formato de mês inválido. Use YYYY-MM');
      where.date = {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
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
        date: this.parseDateUTC(dto.date),
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
    if (dto.date) data.date = this.parseDateUTC(dto.date);
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
    if (appointment.status === 'paid')
      throw new BadRequestException('Agendamento já foi pago');
    if (appointment.status !== 'checkin')
      throw new BadRequestException(
        'Agendamento precisa estar em check-in para receber pagamento',
      );

    const total = dto.entries.reduce((sum, e) => sum + Number(e.amount), 0);
    if (total <= 0)
      throw new BadRequestException('Valor total deve ser maior que zero');

    let doctorEarnings = 0;
    let clinicEarnings = 0;

    if (appointment.appointmentTypeId) {
      const commission =
        await this.prisma.client.appointmentTypeCommission.findUnique({
          where: {
            doctorId_appointmentTypeId: {
              doctorId: appointment.doctorId,
              appointmentTypeId: appointment.appointmentTypeId,
            },
          },
        });

      if (commission) {
        const base = Number(appointment.feeOverride ?? total);

        doctorEarnings =
          commission.doctorRateType === 'percentage'
            ? (base * Number(commission.doctorRate)) / 100
            : Number(commission.doctorRate);

        clinicEarnings =
          commission.clinicRateType === 'percentage'
            ? (base * Number(commission.clinicRate)) / 100
            : Number(commission.clinicRate);
      }
    }

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
            doctorEarnings,
            clinicEarnings,
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
    globalOnly?: boolean,
  ): Promise<BlockedSlotResponseDto[]> {
    const slots = await this.prisma.client.blockedSlot.findMany({
      where: {
        companyId,
        ...(globalOnly
          ? { doctorId: null }
          : doctorId !== undefined
            ? { doctorId }
            : {}),
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return slots.map((s) => new BlockedSlotResponseDto(s));
  }

  async createBlockedSlot(
    companyId: number,
    dto: CreateBlockedSlotDto,
  ): Promise<BlockedSlotResponseDto> {
    if (dto.doctorId) {
      const doctor = await this.prisma.client.doctor.findFirst({
        where: { id: dto.doctorId, companyId, active: true },
      });
      if (!doctor) throw new NotFoundException('Médico não encontrado');
    }

    if (
      dto.endDate &&
      dto.startDate &&
      this.parseDateUTC(dto.endDate) < this.parseDateUTC(dto.startDate)
    ) {
      throw new BadRequestException(
        'endDate não pode ser anterior a startDate',
      );
    }

    const slot = await this.prisma.client.blockedSlot.create({
      data: {
        companyId,
        doctorId: dto.doctorId ?? null,
        startDate: this.parseDateUTC(dto.startDate),
        endDate: dto.endDate ? this.parseDateUTC(dto.endDate) : null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        label: dto.label,
        type: dto.type,
        recurrence: dto.recurrence ?? 'none',
        color: dto.color ?? null,
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
    });

    return new BlockedSlotResponseDto(slot);
  }

  async updateBlockedSlot(
    id: number,
    companyId: number,
    dto: UpdateBlockedSlotDto,
  ): Promise<BlockedSlotResponseDto> {
    const existing = await this.prisma.client.blockedSlot.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Bloqueio não encontrado');

    if (dto.doctorId) {
      const doctor = await this.prisma.client.doctor.findFirst({
        where: { id: dto.doctorId, companyId, active: true },
      });
      if (!doctor) throw new NotFoundException('Médico não encontrado');
    }

    const startDate = dto.startDate
      ? this.parseDateUTC(dto.startDate)
      : undefined;
    const endDate =
      dto.endDate === null
        ? null
        : dto.endDate
          ? this.parseDateUTC(dto.endDate)
          : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        'endDate não pode ser anterior a startDate',
      );
    }

    const slot = await this.prisma.client.blockedSlot.update({
      where: { id },
      data: {
        ...(dto.doctorId !== undefined && { doctorId: dto.doctorId }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
    });

    return new BlockedSlotResponseDto(slot);
  }

  async deleteBlockedSlot(id: number, companyId: number): Promise<void> {
    const existing = await this.prisma.client.blockedSlot.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Bloqueio não encontrado');

    await this.prisma.client.blockedSlot.delete({ where: { id } });
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
      gte: new Date(Date.UTC(year, m - 1, 1)),
      lt: new Date(Date.UTC(year, m, 1)),
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

    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const dayStart = new Date(Date.UTC(year, month - 1, day));
    const dayEnd = new Date(Date.UTC(year, month - 1, day + 1));

    // 1. Schedule do médico para o dia
    const schedule = await this.prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });

    if (!schedule || !schedule.active) {
      return [];
    }

    // 2. Duração do tipo de consulta
    const appointmentType = await this.prisma.client.appointmentType.findFirst({
      where: { id: appointmentTypeId, active: true },
    });
    if (!appointmentType)
      throw new NotFoundException('Tipo de consulta não encontrado');

    const duration = appointmentType.duration;

    // 3. Gera todos os slots possíveis
    const slots = this.generateSlots(
      schedule.startTime,
      schedule.endTime,
      duration,
    );

    // 4. Agendamentos existentes no dia (exceto cancelled)
    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        doctorId,
        date: { gte: dayStart, lt: dayEnd },
        status: { not: 'cancelled' },
      },
      include: { patient: { select: { name: true } } },
    });

    // 5. Bloqueios efetivos para o dia
    // Busca bloqueios do médico específico ou globais (doctorId null)
    // Filtra por recorrência e range de datas
    const blockedSlots = await this.prisma.client.blockedSlot.findMany({
      where: {
        companyId,
        AND: [
          { OR: [{ doctorId }, { doctorId: null }] },
          { startDate: { lte: dayEnd } },
          { OR: [{ endDate: null }, { endDate: { gte: dayStart } }] },
        ],
      },
    });

    // Para weekly, filtra pelo dayOfWeek da startDate
    const effectiveBlocks = blockedSlots.filter((b) => {
      if (b.recurrence === 'none' || b.recurrence === 'daily') return true;
      if (b.recurrence === 'weekly') {
        return new Date(b.startDate).getUTCDay() === dayOfWeek;
      }
      return false;
    });

    // 6. Mapeia status de cada slot
    return slots.map((slot) => {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);

      const bookedBy = appointments.find((a) => {
        const aStart = this.timeToMinutes(a.startTime);
        const aEnd = this.timeToMinutes(a.endTime);
        return slotStart < aEnd && slotEnd > aStart;
      });

      if (bookedBy) {
        return {
          ...slot,
          status: 'booked' as SlotStatus,
          reason: bookedBy.patient.name,
        };
      }

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

  async updateStatus(
    id: number,
    companyId: number,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentResponseDto> {
    await this.findOne(id, companyId);

    const data: Prisma.AppointmentUpdateInput = { status: dto.status };

    if (dto.status === 'cancelled' || dto.status === 'rescheduled') {
      if (!dto.cancellationReason?.trim()) {
        throw new BadRequestException('Motivo é obrigatório');
      }
      data.cancellationReason = dto.cancellationReason.trim();
    }

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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private parseDateUTC(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

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
