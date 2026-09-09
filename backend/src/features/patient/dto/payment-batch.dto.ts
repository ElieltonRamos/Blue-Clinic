// dto/payment-batch.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class PaymentBatchDto {
  @ApiProperty({ type: [Number], example: [12, 13] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  appointmentIds: number[];
}
