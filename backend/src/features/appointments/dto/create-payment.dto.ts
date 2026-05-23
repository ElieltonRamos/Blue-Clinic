import { PaymentMethod } from '../../../../generated/prisma/client';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentEntryDto {
  @ApiProperty({
    enum: PaymentMethod,
    description: 'Método de pagamento',
    example: PaymentMethod.pix,
  })
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido' })
  method: PaymentMethod;

  @ApiProperty({
    description: 'Valor pago',
    example: 150.0,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'O valor (amount) deve ser um número' })
  @Min(0.01, { message: 'O valor mínimo deve ser 0.01' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Valor do troco',
    example: 0.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O troco (change) deve ser um número' })
  @Min(0, { message: 'O troco não pode ser menor que zero' })
  change?: number;
}

export class CreatePaymentDto {
  @ApiProperty({
    type: [PaymentEntryDto],
    description: 'Lista de lançamentos/métodos utilizados no pagamento',
  })
  @IsArray({ message: 'entries deve ser um array' })
  @Type(() => PaymentEntryDto) // Necessário para o class-validator validar cada item do array
  entries: PaymentEntryDto[];
}
