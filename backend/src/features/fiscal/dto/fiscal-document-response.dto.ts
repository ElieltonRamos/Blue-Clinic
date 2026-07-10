import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../../../generated/prisma/client';

export class FiscalDocumentResponseDto {
  @ApiProperty({ description: 'ID do pagamento', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Indica se a nota fiscal foi emitida',
    example: true,
  })
  invoiceIssued: boolean;

  @ApiProperty({
    description: 'Caminho do XML da nota fiscal',
    example: '/uploads/payments/1/123456-789.xml',
    nullable: true,
  })
  invoiceXmlUrl: string | null;

  @ApiProperty({
    description: 'Caminho do PDF (DANFSe) da nota fiscal',
    example: '/uploads/payments/1/123456-789.pdf',
    nullable: true,
  })
  invoicePdfUrl: string | null;

  @ApiProperty({ description: 'Comissão do médico recalculada', example: 80.5 })
  doctorEarnings: number;

  constructor(partial: {
    id: number;
    invoiceIssued: boolean;
    invoiceXmlUrl: string | null;
    invoicePdfUrl: string | null;
    doctorEarnings: Prisma.Decimal | number;
  }) {
    this.id = partial.id;
    this.invoiceIssued = partial.invoiceIssued;
    this.invoiceXmlUrl = partial.invoiceXmlUrl;
    this.invoicePdfUrl = partial.invoicePdfUrl;
    this.doctorEarnings = Number(partial.doctorEarnings);
  }
}
