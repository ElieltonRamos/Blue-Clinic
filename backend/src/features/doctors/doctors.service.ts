import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  Prisma,
  Role,
  Doctor,
  User,
  DoctorSchedule,
  AppointmentTypeCommission,
} from '../../../generated/prisma/client.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import { DoctorFiltersDto } from './dto/doctor-filters.dto.js';
import { DoctorResponseDto } from './dto/doctor-response.dto.js';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto.js';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto.js';
import { CreateCommissionDto } from './dto/create-commission.dto.js';
import { UpdateCommissionDto } from './dto/update-commission.dto.js';
import { DoctorScheduleResponseDto } from './dto/doctor-schedule-response.dto.js';
import { CommissionResponseDto } from './dto/commission-response.dto.js';

type DoctorWithRelations = Doctor & {
  user: Pick<User, 'id' | 'username' | 'role' | 'active'> | null;
  doctorSchedules: DoctorSchedule[];
  appointmentTypeCommissions: (AppointmentTypeCommission & {
    appointmentType: { id: number; name: string; duration: number };
  })[];
};

const DOCTOR_INCLUDE = {
  user: { select: { id: true, username: true, role: true, active: true } },
  doctorSchedules: { orderBy: { dayOfWeek: 'asc' } },
  appointmentTypeCommissions: {
    include: {
      appointmentType: { select: { id: true, name: true, duration: true } },
    },
  },
} satisfies Prisma.DoctorInclude;

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private format(doctor: DoctorWithRelations): DoctorResponseDto {
    return new DoctorResponseDto(doctor);
  }

  private validateId(id: number): void {
    if (isNaN(id) || id <= 0) throw new BadRequestException('ID inválido');
  }

  private async findActiveDoctorById(id: number): Promise<DoctorWithRelations> {
    const doctor = await this.prisma.client.doctor.findFirst({
      where: { id, active: true },
      include: DOCTOR_INCLUDE,
    });
    if (!doctor) throw new NotFoundException('Médico não encontrado');
    return doctor;
  }

  // ── Doctor CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    if (dto.username) {
      if (!dto.password)
        throw new BadRequestException(
          'Senha é obrigatória ao criar usuário para o médico',
        );

      const existingUser = await this.prisma.client.user.findUnique({
        where: { username: dto.username },
      });
      if (existingUser)
        throw new ConflictException('Nome de usuário já está em uso');

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const doctor = await this.prisma.client.doctor.create({
        data: {
          company: { connect: { id: dto.companyId } },
          name: dto.name,
          specialty: dto.specialty,
          avatarUrl: dto.avatarUrl,
          active: dto.active ?? true,
          user: {
            create: {
              company: { connect: { id: dto.companyId } },
              username: dto.username,
              password: hashedPassword,
              role: Role.medico,
              active: true,
            },
          },
        },
        include: DOCTOR_INCLUDE,
      });

      return this.format(doctor);
    }

    const doctor = await this.prisma.client.doctor.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        specialty: dto.specialty,
        avatarUrl: dto.avatarUrl,
        active: dto.active ?? true,
      },
      include: DOCTOR_INCLUDE,
    });

    return this.format(doctor);
  }

  async findAll(filters?: DoctorFiltersDto): Promise<DoctorResponseDto[]> {
    const where: Prisma.DoctorWhereInput = {
      active: filters?.active !== undefined ? filters.active : true,
    };
    if (filters?.name) where.name = { contains: filters.name };
    if (filters?.specialty) where.specialty = { contains: filters.specialty };

    const doctors = await this.prisma.client.doctor.findMany({
      where,
      include: DOCTOR_INCLUDE,
      orderBy: { name: 'asc' },
    });

    return doctors.map((d) => this.format(d));
  }

  async findOne(id: number): Promise<DoctorResponseDto> {
    this.validateId(id);
    return this.format(await this.findActiveDoctorById(id));
  }

  async update(id: number, dto: UpdateDoctorDto): Promise<DoctorResponseDto> {
    this.validateId(id);
    const existing = await this.findActiveDoctorById(id);

    if (dto.username || dto.password) {
      if (existing.userId) {
        if (dto.username && dto.username !== existing.user?.username) {
          const conflict = await this.prisma.client.user.findFirst({
            where: { username: dto.username, id: { not: existing.userId } },
          });
          if (conflict)
            throw new ConflictException('Nome de usuário já está em uso');
        }

        const userData: Prisma.UserUpdateInput = {};
        if (dto.username) userData.username = dto.username;
        if (dto.password)
          userData.password = await bcrypt.hash(dto.password, 10);

        await this.prisma.client.user.update({
          where: { id: existing.userId },
          data: userData,
        });
      } else if (dto.username) {
        if (!dto.password)
          throw new BadRequestException(
            'Senha é obrigatória ao vincular usuário ao médico',
          );

        const conflict = await this.prisma.client.user.findUnique({
          where: { username: dto.username },
        });
        if (conflict)
          throw new ConflictException('Nome de usuário já está em uso');

        await this.prisma.client.user.create({
          data: {
            companyId: existing.companyId,
            username: dto.username,
            password: await bcrypt.hash(dto.password, 10),
            role: Role.medico,
            active: true,
            doctor: { connect: { id: existing.id } },
          },
        });
      }
    }

    const doctorData: Prisma.DoctorUpdateInput = {};
    if (dto.name !== undefined) doctorData.name = dto.name;
    if (dto.specialty !== undefined) doctorData.specialty = dto.specialty;
    if (dto.avatarUrl !== undefined) doctorData.avatarUrl = dto.avatarUrl;
    if (dto.active !== undefined) doctorData.active = dto.active;

    const doctor = await this.prisma.client.doctor.update({
      where: { id },
      data: doctorData,
      include: DOCTOR_INCLUDE,
    });

    return this.format(doctor);
  }

  async remove(id: number): Promise<{ message: string }> {
    this.validateId(id);
    const existing = await this.findActiveDoctorById(id);

    if (existing.userId) {
      await this.prisma.client.user.update({
        where: { id: existing.userId },
        data: { active: false },
      });
    }

    await this.prisma.client.doctor.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Médico removido com sucesso' };
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  async createSchedule(
    doctorId: number,
    dto: CreateDoctorScheduleDto,
  ): Promise<DoctorScheduleResponseDto> {
    this.validateId(doctorId);
    await this.findActiveDoctorById(doctorId);

    const conflict = await this.prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: dto.dayOfWeek } },
    });
    if (conflict)
      throw new ConflictException('Já existe horário cadastrado para este dia');

    const schedule = await this.prisma.client.doctorSchedule.create({
      data: { doctorId, ...dto, active: dto.active ?? true },
    });

    return new DoctorScheduleResponseDto(schedule);
  }

  async findSchedules(doctorId: number): Promise<DoctorScheduleResponseDto[]> {
    this.validateId(doctorId);
    await this.findActiveDoctorById(doctorId);

    const schedules = await this.prisma.client.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return schedules.map((s) => new DoctorScheduleResponseDto(s));
  }

  async updateSchedule(
    doctorId: number,
    scheduleId: number,
    dto: UpdateDoctorScheduleDto,
  ): Promise<DoctorScheduleResponseDto> {
    this.validateId(doctorId);
    this.validateId(scheduleId);

    const schedule = await this.prisma.client.doctorSchedule.findFirst({
      where: { id: scheduleId, doctorId },
    });
    if (!schedule) throw new NotFoundException('Horário não encontrado');

    if (dto.dayOfWeek !== undefined && dto.dayOfWeek !== schedule.dayOfWeek) {
      const conflict = await this.prisma.client.doctorSchedule.findUnique({
        where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: dto.dayOfWeek } },
      });
      if (conflict)
        throw new ConflictException(
          'Já existe horário cadastrado para este dia',
        );
    }

    const updated = await this.prisma.client.doctorSchedule.update({
      where: { id: scheduleId },
      data: dto,
    });

    return new DoctorScheduleResponseDto(updated);
  }

  async removeSchedule(
    doctorId: number,
    scheduleId: number,
  ): Promise<{ message: string }> {
    this.validateId(doctorId);
    this.validateId(scheduleId);

    const schedule = await this.prisma.client.doctorSchedule.findFirst({
      where: { id: scheduleId, doctorId },
    });
    if (!schedule) throw new NotFoundException('Horário não encontrado');

    await this.prisma.client.doctorSchedule.delete({
      where: { id: scheduleId },
    });

    return { message: 'Horário removido com sucesso' };
  }

  // ── Commissions ────────────────────────────────────────────────────────────

  async createCommission(
    doctorId: number,
    dto: CreateCommissionDto,
  ): Promise<CommissionResponseDto> {
    this.validateId(doctorId);
    await this.findActiveDoctorById(doctorId);

    const type = await this.prisma.client.appointmentType.findFirst({
      where: { id: dto.appointmentTypeId, active: true },
    });
    if (!type) throw new NotFoundException('Tipo de consulta não encontrado');

    const conflict =
      await this.prisma.client.appointmentTypeCommission.findUnique({
        where: {
          doctorId_appointmentTypeId: {
            doctorId,
            appointmentTypeId: dto.appointmentTypeId,
          },
        },
      });
    if (conflict)
      throw new ConflictException(
        'Comissão já cadastrada para este médico e tipo',
      );

    const commission =
      await this.prisma.client.appointmentTypeCommission.create({
        data: { doctorId, ...dto },
        include: {
          appointmentType: { select: { id: true, name: true, duration: true } },
        },
      });

    return new CommissionResponseDto(commission);
  }

  async findCommissions(doctorId: number): Promise<CommissionResponseDto[]> {
    this.validateId(doctorId);
    await this.findActiveDoctorById(doctorId);

    const commissions =
      await this.prisma.client.appointmentTypeCommission.findMany({
        where: { doctorId },
        include: {
          appointmentType: { select: { id: true, name: true, duration: true } },
        },
      });

    return commissions.map((c) => new CommissionResponseDto(c));
  }

  async updateCommission(
    doctorId: number,
    commissionId: number,
    dto: UpdateCommissionDto,
  ): Promise<CommissionResponseDto> {
    this.validateId(doctorId);
    this.validateId(commissionId);

    const commission =
      await this.prisma.client.appointmentTypeCommission.findFirst({
        where: { id: commissionId, doctorId },
      });
    if (!commission) throw new NotFoundException('Comissão não encontrada');

    const updated = await this.prisma.client.appointmentTypeCommission.update({
      where: { id: commissionId },
      data: dto,
      include: {
        appointmentType: { select: { id: true, name: true, duration: true } },
      },
    });

    return new CommissionResponseDto(updated);
  }

  async removeCommission(
    doctorId: number,
    commissionId: number,
  ): Promise<{ message: string }> {
    this.validateId(doctorId);
    this.validateId(commissionId);

    const commission =
      await this.prisma.client.appointmentTypeCommission.findFirst({
        where: { id: commissionId, doctorId },
      });
    if (!commission) throw new NotFoundException('Comissão não encontrada');

    await this.prisma.client.appointmentTypeCommission.delete({
      where: { id: commissionId },
    });

    return { message: 'Comissão removida com sucesso' };
  }
}
