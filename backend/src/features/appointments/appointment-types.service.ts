/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// appointment-types.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto.js';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto.js';
import { AppointmentTypeResponseDto } from './dto/appointment-type-response.dto.js';

@Injectable()
export class AppointmentTypesService {
  constructor(private prisma: PrismaService) {}

  private validateId(id: number): void {
    if (isNaN(id) || id <= 0) throw new BadRequestException('ID inválido');
  }

  private async findActiveById(id: number, companyId: number) {
    const type = await this.prisma.client.appointmentType.findFirst({
      where: { id, companyId, active: true },
    });
    if (!type) throw new NotFoundException('Tipo de consulta não encontrado');
    return type;
  }

  async create(
    companyId: number,
    dto: CreateAppointmentTypeDto,
  ): Promise<AppointmentTypeResponseDto> {
    const type = await this.prisma.client.appointmentType.create({
      data: {
        companyId,
        name: dto.name,
        duration: dto.duration,
        active: true,
      },
    });
    return new AppointmentTypeResponseDto(type);
  }

  async findAll(companyId: number): Promise<AppointmentTypeResponseDto[]> {
    const types = await this.prisma.client.appointmentType.findMany({
      where: { companyId, active: true },
      orderBy: { name: 'asc' },
    });
    return types.map((t) => new AppointmentTypeResponseDto(t));
  }

  async findOne(
    id: number,
    companyId: number,
  ): Promise<AppointmentTypeResponseDto> {
    this.validateId(id);
    const type = await this.findActiveById(id, companyId);
    return new AppointmentTypeResponseDto(type);
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAppointmentTypeDto,
  ): Promise<AppointmentTypeResponseDto> {
    this.validateId(id);
    await this.findActiveById(id, companyId);

    const data: Prisma.AppointmentTypeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.duration !== undefined) data.duration = dto.duration;

    const type = await this.prisma.client.appointmentType.update({
      where: { id },
      data,
    });
    return new AppointmentTypeResponseDto(type);
  }

  async remove(id: number, companyId: number): Promise<{ message: string }> {
    this.validateId(id);
    await this.findActiveById(id, companyId);

    await this.prisma.client.appointmentType.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Tipo de consulta removido com sucesso' };
  }
}
