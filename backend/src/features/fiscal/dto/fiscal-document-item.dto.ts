import { ApiProperty } from '@nestjs/swagger';

export class FiscalDocumentItemDto {
  @ApiProperty() paymentId: number;
  @ApiProperty() patientName: string;
  @ApiProperty() doctorName: string;
  @ApiProperty() value: number;
  @ApiProperty() doctorEarnings: number;
  @ApiProperty() date: string;
  @ApiProperty({ nullable: true }) invoiceXmlUrl: string | null;
  @ApiProperty({ nullable: true }) invoicePdfUrl: string | null;
}
