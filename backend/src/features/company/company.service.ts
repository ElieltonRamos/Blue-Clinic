import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async getCompany(id: number) {
    const company = await this.prisma.client.company.findUnique({
      where: { id },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async updateCompany(id: number, dto: Prisma.CompanyUpdateInput) {
    await this.getCompany(id);
    return this.prisma.client.company.update({
      where: { id },
      data: dto,
    });
  }

  async getIntegration(companyId: number) {
    return this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: {
        id: true,
        phoneNumberId: true,
        botEnabled: true,
        autoConfirm: true,
        autoReminder: true,
        reminderHours: true,
        humanFallback: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upsertIntegration(
    companyId: number,
    dto: {
      phoneNumberId?: string;
      accessToken?: string;
      botEnabled?: boolean;
      autoConfirm?: boolean;
      autoReminder?: boolean;
      reminderHours?: number;
      humanFallback?: boolean;
    },
  ) {
    await this.prisma.client.whatsappConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        instanceId: `company_${companyId}`,
        phoneNumberId: dto.phoneNumberId,
        accessToken: dto.accessToken,
        botEnabled: dto.botEnabled ?? true,
        autoConfirm: dto.autoConfirm ?? false,
        autoReminder: dto.autoReminder ?? true,
        reminderHours: dto.reminderHours ?? 24,
        humanFallback: dto.humanFallback ?? true,
      },
      update: {
        ...(dto.phoneNumberId !== undefined && {
          phoneNumberId: dto.phoneNumberId,
        }),
        ...(dto.accessToken !== undefined && { accessToken: dto.accessToken }),
        ...(dto.botEnabled !== undefined && { botEnabled: dto.botEnabled }),
        ...(dto.autoConfirm !== undefined && { autoConfirm: dto.autoConfirm }),
        ...(dto.autoReminder !== undefined && {
          autoReminder: dto.autoReminder,
        }),
        ...(dto.reminderHours !== undefined && {
          reminderHours: dto.reminderHours,
        }),
        ...(dto.humanFallback !== undefined && {
          humanFallback: dto.humanFallback,
        }),
      },
    });

    return this.getIntegration(companyId);
  }
}
