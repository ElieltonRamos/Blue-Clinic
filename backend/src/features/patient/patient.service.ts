// patients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PatientFiltersDto } from './dto/patient-filters.dto.js';
import { PatientResponseDto } from './dto/patient-response.dto.js';
import { PatientDetailResponseDto } from './dto/patient-detail-response.dto.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientDocument } from '../../../generated/prisma/client.js';

export interface UploadedFileCustom {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    companyId: number,
    filters: PatientFiltersDto,
  ): Promise<{ data: PatientResponseDto[]; total: number }> {
    const where: Prisma.PatientWhereInput = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { cpf: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    const [patients, total] = await Promise.all([
      this.prisma.client.patient.findMany({
        where,
        include: {
          appointments: {
            select: { date: true },
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.client.patient.count({ where }),
    ]);

    return {
      data: patients.map((p) => new PatientResponseDto(p)),
      total,
    };
  }

  async findOne(
    id: number,
    companyId: number,
  ): Promise<PatientDetailResponseDto> {
    const patient = await this.prisma.client.patient.findFirst({
      where: { id, companyId },
      include: {
        documents: true,
        appointments: {
          include: {
            consultation: {
              select: { title: true, notes: true, active: true },
            },
            doctor: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return new PatientDetailResponseDto(patient);
  }

  async create(
    companyId: number,
    dto: CreatePatientDto,
  ): Promise<PatientDetailResponseDto> {
    const patient = await this.prisma.client.patient.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        cpf: dto.cpf,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        status: 'Ativo',
      },
      include: {
        documents: true,
        appointments: {
          include: {
            consultation: {
              select: { title: true, notes: true, active: true },
            },
            doctor: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    return new PatientDetailResponseDto(patient);
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdatePatientDto,
  ): Promise<PatientDetailResponseDto> {
    await this.findOne(id, companyId);

    const data: Prisma.PatientUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.cpf !== undefined) data.cpf = dto.cpf;
    if (dto.birthDate !== undefined) data.birthDate = new Date(dto.birthDate);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.whatsappActive !== undefined)
      data.whatsappActive = dto.whatsappActive;
    if (dto.lgpdConsent !== undefined) data.lgpdConsent = dto.lgpdConsent;

    const patient = await this.prisma.client.patient.update({
      where: { id },
      data,
      include: {
        documents: true,
        appointments: {
          include: {
            consultation: {
              select: { title: true, notes: true, active: true },
            },
            doctor: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    return new PatientDetailResponseDto(patient);
  }

  async uploadDocument(
    id: number,
    companyId: number,
    file: UploadedFileCustom,
  ): Promise<PatientDocument> {
    await this.findOne(id, companyId);

    const url = `/uploads/patients/${id}/${file.filename}`;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const type = file.mimetype.includes('pdf') ? 'pdf' : 'image';

    return this.prisma.client.patientDocument.create({
      data: {
        patientId: id,
        name: file.originalname,
        size: sizeMb,
        type,
        url,
      },
    });
  }
}
