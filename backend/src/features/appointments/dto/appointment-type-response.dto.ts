/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// appointment-type-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AppointmentTypeResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() companyId: number;
  @ApiProperty() name: string;
  @ApiProperty() duration: number;
  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(t: any) {
    this.id = t.id;
    this.companyId = t.companyId;
    this.name = t.name;
    this.duration = t.duration;
    this.active = t.active;
    this.createdAt = t.createdAt;
    this.updatedAt = t.updatedAt;
  }
}
