/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionType } from '../../../../generated/prisma/client.js';

export class DoctorUserDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty() role: string;
  @ApiProperty() active: boolean;
}

export class DoctorScheduleSummaryDto {
  @ApiProperty() id: number;
  @ApiProperty() dayOfWeek: number;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() active: boolean;
}

export class AppointmentTypeSummaryDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() duration: number;
}

export class DoctorCommissionSummaryDto {
  @ApiProperty() id: number;
  @ApiProperty() appointmentTypeId: number;
  @ApiProperty({ enum: CommissionType }) doctorRateType: CommissionType;
  @ApiProperty() doctorRate: number;
  @ApiProperty({ enum: CommissionType }) clinicRateType: CommissionType;
  @ApiProperty() clinicRate: number;
  @ApiProperty({ type: () => AppointmentTypeSummaryDto })
  appointmentType: AppointmentTypeSummaryDto;
}

export class DoctorResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() companyId: number;
  @ApiPropertyOptional() userId?: number | null;
  @ApiProperty() name: string;
  @ApiProperty() specialty: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty() active: boolean;
  @ApiPropertyOptional({ type: () => DoctorUserDto })
  user?: DoctorUserDto | null;
  @ApiProperty({ type: () => [DoctorScheduleSummaryDto] })
  schedules: DoctorScheduleSummaryDto[];
  @ApiProperty({ type: () => [DoctorCommissionSummaryDto] })
  commissions: DoctorCommissionSummaryDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(partial: any) {
    this.id = partial.id;
    this.companyId = partial.companyId;
    this.userId = partial.userId;
    this.name = partial.name;
    this.specialty = partial.specialty;
    this.avatarUrl = partial.avatarUrl;
    this.active = partial.active;
    this.user = partial.user ?? null;
    this.createdAt = partial.createdAt;
    this.updatedAt = partial.updatedAt;

    this.schedules = (partial.doctorSchedules ?? []).map((s: any) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      active: s.active,
    }));

    this.commissions = (partial.appointmentTypeCommissions ?? []).map(
      (c: any) => ({
        id: c.id,
        appointmentTypeId: c.appointmentTypeId,
        doctorRateType: c.doctorRateType,
        doctorRate: Number(c.doctorRate),
        clinicRateType: c.clinicRateType,
        clinicRate: Number(c.clinicRate),
        appointmentType: c.appointmentType,
      }),
    );
  }
}
