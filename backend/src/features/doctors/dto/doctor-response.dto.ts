import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorUserDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty() role: string;
  @ApiProperty() active: boolean;
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
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(partial: Partial<DoctorResponseDto>) {
    Object.assign(this, partial);
  }
}
