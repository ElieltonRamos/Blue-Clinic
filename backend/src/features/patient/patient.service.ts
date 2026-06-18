// patients.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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

const PATIENT_DETAIL_INCLUDE = {
  documents: true,
  appointments: {
    include: {
      consultation: {
        select: { title: true, notes: true, active: true },
      },
      doctor: { select: { name: true } },
      appointmentType: { select: { name: true } },
    },
    orderBy: { date: 'desc' as const },
  },
} satisfies Prisma.PatientInclude;

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
      include: PATIENT_DETAIL_INCLUDE,
    });

    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return new PatientDetailResponseDto(patient);
  }

  async create(
    companyId: number,
    dto: CreatePatientDto,
  ): Promise<PatientDetailResponseDto> {
    await this.assertNoDuplicateName(companyId, dto.name);
    await this.assertNoDuplicateCpf(companyId, dto.cpf);

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
      include: PATIENT_DETAIL_INCLUDE,
    });

    return new PatientDetailResponseDto(patient);
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdatePatientDto,
  ): Promise<PatientDetailResponseDto> {
    const current = await this.prisma.client.patient.findFirst({
      where: { id, companyId },
      select: { id: true, phone: true },
    });
    if (!current) throw new NotFoundException('Paciente não encontrado');

    if (dto.name !== undefined)
      await this.assertNoDuplicateName(companyId, dto.name, id);
    if (dto.cpf !== undefined)
      await this.assertNoDuplicateCpf(companyId, dto.cpf, id);

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

    const phoneChanged = dto.phone !== undefined && dto.phone !== current.phone;

    const patient = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id },
        data,
        include: PATIENT_DETAIL_INCLUDE,
      });

      if (phoneChanged) {
        if (current.phone) {
          await tx.conversation.updateMany({
            where: { phone: current.phone, patientId: id },
            data: { patientId: null },
          });
        }

        await tx.conversation.updateMany({
          where: { phone: dto.phone, companyId },
          data: { patientId: id },
        });
      }

      return updated;
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

  // ─── private helpers ───────────────────────────────────────────────────────

  private validateCpfFormat(cpf: string | undefined): void {
    if (cpf !== undefined && !/^\d{11}$/.test(cpf)) {
      throw new ConflictException(
        'CPF deve conter exatamente 11 dígitos numéricos',
      );
    }
  }

  private async assertNoDuplicateName(
    companyId: number,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.prisma.client.patient.findFirst({
      where: {
        companyId,
        name: { contains: name },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing)
      throw new ConflictException('Já existe um paciente com este nome');
  }

  private async assertNoDuplicateCpf(
    companyId: number,
    cpf: string | undefined,
    excludeId?: number,
  ): Promise<void> {
    if (!cpf) return;

    const existing = await this.prisma.client.patient.findFirst({
      where: {
        companyId,
        cpf,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing)
      throw new ConflictException('Já existe um paciente com este CPF');
  }
}
