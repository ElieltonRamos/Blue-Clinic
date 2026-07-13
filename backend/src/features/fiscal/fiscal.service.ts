import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { FiscalDocumentResponseDto } from './dto/fiscal-document-response.dto.js';

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
    if (xmlFile) {
      data.invoiceXmlUrl = `/uploads/payments/${paymentId}/${xmlFile.filename}`;
    }
    if (pdfFile) {
      data.invoicePdfUrl = `/uploads/payments/${paymentId}/${pdfFile.filename}`;
    }

    let deductionExceeded = false;
    if (!payment.commissionPaid) {
      const result = await this.calculateDoctorEarnings(
        payment.appointment,
        Number(payment.value),
        true,
      );
      data.doctorEarnings = result.value;
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
  ): Promise<{ value: number; deductionExceeded: boolean }> {
    if (!appointment.appointmentTypeId)
      return { value: 0, deductionExceeded: false };

    const commission =
      await this.prisma.client.appointmentTypeCommission.findUnique({
        where: {
          doctorId_appointmentTypeId: {
            doctorId: appointment.doctorId,
            appointmentTypeId: appointment.appointmentTypeId,
          },
        },
      });
    if (!commission) return { value: 0, deductionExceeded: false };

    const base = Number(appointment.feeOverride ?? paymentValue);
    let doctorEarnings =
      commission.doctorRateType === 'percentage'
        ? (base * Number(commission.doctorRate)) / 100
        : Number(commission.doctorRate);

    let deductionExceeded = false;

    if (applyDeduction && commission.nfDeductionValue !== null) {
      doctorEarnings =
        commission.nfDeductionType === 'percentage'
          ? doctorEarnings -
            doctorEarnings * (Number(commission.nfDeductionValue) / 100)
          : doctorEarnings - Number(commission.nfDeductionValue);

      if (doctorEarnings < 0) {
        deductionExceeded = true;
        doctorEarnings = 0;
      }
    }

    return { value: doctorEarnings, deductionExceeded };
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
}
