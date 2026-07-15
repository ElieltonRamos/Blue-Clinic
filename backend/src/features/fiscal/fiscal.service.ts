import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { FiscalDocumentResponseDto } from './dto/fiscal-document-response.dto.js';
import { FiscalDocumentItemDto } from './dto/fiscal-document-item.dto.js';
import { FiscalFilterDto } from './dto/fiscal-filter.dto.js';
import { FiscalSummaryDto } from './dto/fiscal-summary.dto.js';
import { FiscalPendingItemDto } from './dto/fiscal-pending-item.dto.js';
import { createReadStream, existsSync } from 'node:fs';

export interface UploadedFileCustom {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class FiscalService {
  constructor(private prisma: PrismaService) {}

  async uploadInvoice(
    paymentId: number,
    companyId: number,
    xmlFile: UploadedFileCustom | null,
    pdfFile: UploadedFileCustom | null,
  ): Promise<FiscalDocumentResponseDto> {
    const payment = await this.findPaymentOrThrow(paymentId, companyId);

    const data: Prisma.PaymentUpdateInput = { invoiceIssued: true };
    if (xmlFile)
      data.invoiceXmlUrl = `/uploads/payments/${paymentId}/${xmlFile.filename}`;
    if (pdfFile)
      data.invoicePdfUrl = `/uploads/payments/${paymentId}/${pdfFile.filename}`;

    let deductionExceeded = false;
    if (!payment.commissionPaid) {
      const result = await this.calculateDoctorEarnings(
        payment.appointment,
        Number(payment.value),
        true,
      );
      data.doctorEarnings = result.value;
      data.deductedAmount = result.deductedAmount;
      deductionExceeded = result.deductionExceeded;
    }

    const updated = await this.prisma.client.payment.update({
      where: { id: paymentId },
      data,
    });

    return new FiscalDocumentResponseDto(updated, deductionExceeded);
  }

  async removeInvoice(
    paymentId: number,
    companyId: number,
  ): Promise<FiscalDocumentResponseDto> {
    const payment = await this.findPaymentOrThrow(paymentId, companyId);

    if (!payment.invoiceIssued) {
      throw new NotFoundException('Pagamento não possui nota fiscal anexada.');
    }

    await this.deleteFileIfExists(payment.invoiceXmlUrl);
    await this.deleteFileIfExists(payment.invoicePdfUrl);

    const data: Prisma.PaymentUpdateInput = {
      invoiceIssued: false,
      invoiceXmlUrl: null,
      invoicePdfUrl: null,
      deductedAmount: 0,
    };

    if (!payment.commissionPaid) {
      const result = await this.calculateDoctorEarnings(
        payment.appointment,
        Number(payment.value),
        false,
      );
      data.doctorEarnings = result.value;
    }

    const updated = await this.prisma.client.payment.update({
      where: { id: paymentId },
      data,
    });

    return new FiscalDocumentResponseDto(updated, false);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async findPaymentOrThrow(paymentId: number, companyId: number) {
    const payment = await this.prisma.client.payment.findFirst({
      where: { id: paymentId, appointment: { doctor: { companyId } } },
      include: {
        appointment: {
          select: {
            doctorId: true,
            appointmentTypeId: true,
            feeOverride: true,
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    return payment;
  }

  private async calculateDoctorEarnings(
    appointment: {
      doctorId: number;
      appointmentTypeId: number | null;
      feeOverride: Prisma.Decimal | null;
    },
    paymentValue: number,
    applyDeduction: boolean,
  ): Promise<{
    value: number;
    deductedAmount: number;
    deductionExceeded: boolean;
  }> {
    if (!appointment.appointmentTypeId)
      return { value: 0, deductedAmount: 0, deductionExceeded: false };

    const commission =
      await this.prisma.client.appointmentTypeCommission.findUnique({
        where: {
          doctorId_appointmentTypeId: {
            doctorId: appointment.doctorId,
            appointmentTypeId: appointment.appointmentTypeId,
          },
        },
      });
    if (!commission)
      return { value: 0, deductedAmount: 0, deductionExceeded: false };

    const base = Number(appointment.feeOverride ?? paymentValue);
    let doctorEarnings =
      commission.doctorRateType === 'percentage'
        ? (base * Number(commission.doctorRate)) / 100
        : Number(commission.doctorRate);

    let deductedAmount = 0;
    let deductionExceeded = false;

    if (applyDeduction && commission.nfDeductionValue !== null) {
      const beforeDeduction = doctorEarnings;
      doctorEarnings =
        commission.nfDeductionType === 'percentage'
          ? doctorEarnings -
            doctorEarnings * (Number(commission.nfDeductionValue) / 100)
          : doctorEarnings - Number(commission.nfDeductionValue);

      if (doctorEarnings < 0) {
        deductionExceeded = true;
        doctorEarnings = 0;
      }

      deductedAmount = beforeDeduction - doctorEarnings;
    }

    return { value: doctorEarnings, deductedAmount, deductionExceeded };
  }

  async streamFile(
    paymentId: number,
    companyId: number,
    type: 'xml' | 'pdf',
  ): Promise<StreamableFile> {
    const payment = await this.findPaymentOrThrow(paymentId, companyId);

    const url = type === 'xml' ? payment.invoiceXmlUrl : payment.invoicePdfUrl;
    if (!url) {
      throw new NotFoundException(
        `Arquivo ${type.toUpperCase()} não encontrado.`,
      );
    }

    const filePath = join(process.cwd(), url.replace(/^\//, ''));
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado no servidor.');
    }

    return new StreamableFile(createReadStream(filePath), {
      type: type === 'xml' ? 'application/xml' : 'application/pdf',
    });
  }

  private async deleteFileIfExists(url: string | null): Promise<void> {
    if (!url) return;
    const filePath = join(process.cwd(), url.replace(/^\//, ''));
    try {
      await unlink(filePath);
    } catch {
      // arquivo já não existe no disco, ignora
    }
  }

  async getSummary(
    companyId: number,
    filter: FiscalFilterDto,
  ): Promise<FiscalSummaryDto> {
    const range = this.parseDateRange(filter);

    const [issuedCount, pendingCount, deductedResult] = await Promise.all([
      this.prisma.client.payment.count({
        where: {
          invoiceIssued: true,
          date: range,
          appointment: { doctor: { companyId } },
        },
      }),
      this.prisma.client.payment.count({
        where: {
          invoiceIssued: false,
          date: range,
          appointment: {
            doctor: { companyId },
            status: { in: ['paid', 'finished'] },
          },
        },
      }),
      this.prisma.client.payment.aggregate({
        where: {
          invoiceIssued: true,
          date: range,
          appointment: { doctor: { companyId } },
        },
        _sum: { deductedAmount: true },
      }),
    ]);

    const totalDeducted = Number(deductedResult._sum.deductedAmount ?? 0);

    return { issuedCount, pendingCount, totalDeducted };
  }

  async getDocuments(
    companyId: number,
    filter: FiscalFilterDto,
  ): Promise<FiscalDocumentItemDto[]> {
    const range = this.parseDateRange(filter);

    const payments = await this.prisma.client.payment.findMany({
      where: {
        invoiceIssued: true,
        date: range,
        appointment: {
          doctor: {
            companyId,
            ...(filter.doctorId && { id: filter.doctorId }),
          },
        },
      },
      include: {
        appointment: {
          include: {
            patient: { select: { name: true } },
            doctor: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return payments.map((p) => ({
      paymentId: p.id,
      patientName: p.appointment.patient.name,
      doctorName: p.appointment.doctor.name,
      value: Number(p.value),
      doctorEarnings: Number(p.doctorEarnings),
      date: this.toLocalDateString(p.date),
      invoiceXmlUrl: p.invoiceXmlUrl,
      invoicePdfUrl: p.invoicePdfUrl,
    }));
  }

  async getPending(
    companyId: number,
    filter: FiscalFilterDto,
  ): Promise<FiscalPendingItemDto[]> {
    const range = this.parseDateRange(filter);

    const payments = await this.prisma.client.payment.findMany({
      where: {
        invoiceIssued: false,
        date: range,
        appointment: {
          doctor: {
            companyId,
            ...(filter.doctorId && { id: filter.doctorId }),
          },
          status: { in: ['paid', 'finished'] },
        },
      },
      include: {
        appointment: {
          include: {
            patient: { select: { name: true } },
            doctor: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return payments.map((p) => ({
      paymentId: p.id,
      appointmentId: p.appointmentId,
      patientName: p.appointment.patient.name,
      doctorName: p.appointment.doctor.name,
      value: Number(p.value),
      date: this.toLocalDateString(p.date),
    }));
  }

  // ── Helpers de data (mesmo padrão do FinanceService) ──────────────────────

  private parseDateRange(filter: FiscalFilterDto): { gte: Date; lte: Date } {
    const gte = new Date(`${filter.dateFrom}T00:00:00.000-03:00`);
    const lte = new Date(`${filter.dateTo}T23:59:59.999-03:00`);
    return { gte, lte };
  }

  private toLocalDateString(date: Date): string {
    return date
      .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/')
      .reverse()
      .join('-');
  }
}
