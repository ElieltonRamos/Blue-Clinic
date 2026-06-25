// doctor-schedule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { DoctorSchedule } from '../../../../generated/prisma/client.js';

export class DoctorScheduleResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() doctorId: number;
  @ApiProperty() dayOfWeek: number;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() active: boolean;

  constructor(s: DoctorSchedule) {
    this.id = s.id;
    this.doctorId = s.doctorId;
    this.dayOfWeek = s.dayOfWeek;
    this.startTime = s.startTime;
    this.endTime = s.endTime;
    this.active = s.active;
  }
}
