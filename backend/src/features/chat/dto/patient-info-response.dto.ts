/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// dto/patient-info-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientInfoResponseDto {
  @ApiPropertyOptional() id: number | null;
  @ApiPropertyOptional() name: string | null;
  @ApiProperty() phone: string | null;
  @ApiPropertyOptional() memberSince: Date | null;
  @ApiPropertyOptional() lastVisit: Date | null;
  @ApiProperty() blocked: boolean;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.phone = data.phone;
    this.memberSince = data.memberSince;
    this.lastVisit = data.lastVisit;
    this.blocked = data.blocked;
  }
}
