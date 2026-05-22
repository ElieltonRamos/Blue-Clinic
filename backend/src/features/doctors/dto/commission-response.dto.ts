// commission-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  AppointmentTypeCommission,
  CommissionType,
} from '../../../../generated/prisma/client.js';

type CommissionWithType = AppointmentTypeCommission & {
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

  constructor(c: CommissionWithType) {
    this.id = c.id;
    this.doctorId = c.doctorId;
    this.appointmentTypeId = c.appointmentTypeId;
    this.doctorRateType = c.doctorRateType;
    this.doctorRate = Number(c.doctorRate);
    this.clinicRateType = c.clinicRateType;
    this.clinicRate = Number(c.clinicRate);
    this.appointmentType = c.appointmentType;
  }
}
