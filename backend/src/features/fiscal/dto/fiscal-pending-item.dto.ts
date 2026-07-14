import { ApiProperty } from '@nestjs/swagger';

export class FiscalPendingItemDto {
  @ApiProperty() paymentId: number;
  @ApiProperty() appointmentId: number;
  @ApiProperty() patientName: string;
  @ApiProperty() doctorName: string;
  @ApiProperty() value: number;
  @ApiProperty() date: string;
}
