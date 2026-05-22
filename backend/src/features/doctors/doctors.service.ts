/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
} from '../../../generated/prisma/client.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import { DoctorFiltersDto } from './dto/doctor-filters.dto.js';
import { DoctorResponseDto } from './dto/doctor-response.dto.js';

type DoctorWithUser = Doctor & {
  user: Pick<User, 'id' | 'username' | 'role' | 'active'> | null;
};

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  private format(doctor: DoctorWithUser): DoctorResponseDto {
    return new DoctorResponseDto(doctor);
  }

  private validateId(id: number): void {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException('ID inválido');
    }
  }

  private async findActiveDoctorById(id: number): Promise<DoctorWithUser> {
    const doctor = await this.prisma.client.doctor.findFirst({
      where: { id, active: true },
      include: {
        user: {
          select: { id: true, username: true, role: true, active: true },
        },
      },
    });
    if (!doctor) throw new NotFoundException('Médico não encontrado');
    return doctor;
  }

  async create(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    if (dto.username) {
      if (!dto.password) {
        throw new BadRequestException(
          'Senha é obrigatória ao criar usuário para o médico',
        );
      }

      const existingUser = await this.prisma.client.user.findUnique({
        where: { username: dto.username },
      });
      if (existingUser) {
        throw new ConflictException('Nome de usuário já está em uso');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const data: Prisma.DoctorCreateInput = {
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
      };

      const doctor = await this.prisma.client.doctor.create({
        data,
        include: {
          user: {
            select: { id: true, username: true, role: true, active: true },
          },
        },
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
      include: {
        user: {
          select: { id: true, username: true, role: true, active: true },
        },
      },
    });

    return this.format(doctor);
  }

  async findAll(filters?: DoctorFiltersDto): Promise<DoctorResponseDto[]> {
    const where: Prisma.DoctorWhereInput = {
      active: filters?.active !== undefined ? filters.active : true,
    };

    if (filters?.name) {
      where.name = { contains: filters.name };
    }
    if (filters?.specialty) {
      where.specialty = { contains: filters.specialty };
    }

    const doctors = await this.prisma.client.doctor.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, role: true, active: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return doctors.map((d) => this.format(d));
  }

  async findOne(id: number): Promise<DoctorResponseDto> {
    this.validateId(id);
    const doctor = await this.findActiveDoctorById(id);
    return this.format(doctor);
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
        if (!dto.password) {
          throw new BadRequestException(
            'Senha é obrigatória ao vincular usuário ao médico',
          );
        }

        const conflict = await this.prisma.client.user.findUnique({
          where: { username: dto.username },
        });
        if (conflict)
          throw new ConflictException('Nome de usuário já está em uso');

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.prisma.client.user.create({
          data: {
            companyId: existing.companyId,
            username: dto.username,
            password: hashedPassword,
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
      include: {
        user: {
          select: { id: true, username: true, role: true, active: true },
        },
      },
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
}
