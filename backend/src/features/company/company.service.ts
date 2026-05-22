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
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
    });
    if (!config) throw new NotFoundException('Configuração não encontrada');
    return config;
  }
}
