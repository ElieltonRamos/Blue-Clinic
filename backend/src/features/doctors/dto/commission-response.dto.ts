import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppointmentTypeCommission,
  CommissionType,
} from '../../../../generated/prisma/client.js';

type CommissionWithRelations = AppointmentTypeCommission & {
  appointmentType: { id: number; name: string; duration: number };
};

class AppointmentTypeSummaryDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() duration: number;
}

export class CommissionResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() doctorId: number;
  @ApiProperty() appointmentTypeId: number;
  @ApiProperty({ enum: CommissionType }) doctorRateType: CommissionType;
  @ApiProperty() doctorRate: number;
  @ApiProperty({ enum: CommissionType }) clinicRateType: CommissionType;
  @ApiProperty() clinicRate: number;
  @ApiProperty({ type: AppointmentTypeSummaryDto })
  appointmentType: AppointmentTypeSummaryDto;

  @ApiProperty({ description: 'Valor cobrado do paciente' })
  price: number;

  @ApiPropertyOptional({ enum: CommissionType, nullable: true })
  nfDeductionType: CommissionType | null;

  @ApiPropertyOptional({ nullable: true })
  nfDeductionValue: number | null;

  constructor(c: CommissionWithRelations) {
    this.id = c.id;
    this.doctorId = c.doctorId;
    this.appointmentTypeId = c.appointmentTypeId;
    this.doctorRateType = c.doctorRateType;
    this.doctorRate = Number(c.doctorRate);
    this.clinicRateType = c.clinicRateType;
    this.clinicRate = Number(c.clinicRate);
    this.appointmentType = c.appointmentType;
    this.price = Number(c.price);
    this.nfDeductionType = c.nfDeductionType;
    this.nfDeductionValue =
      c.nfDeductionValue !== null ? Number(c.nfDeductionValue) : null;
  }
}
