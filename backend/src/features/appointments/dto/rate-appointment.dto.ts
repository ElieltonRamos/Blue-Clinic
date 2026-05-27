// dto/rate-appointment.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class RateAppointmentDto {
  @ApiProperty({ example: 4.5, minimum: 1, maximum: 5 })
  @IsNumber({}, { message: 'A avaliação deve ser um número' })
  @Min(1, { message: 'A avaliação mínima é 1' })
  @Max(5, { message: 'A avaliação máxima é 5' })
  rating: number;
}
