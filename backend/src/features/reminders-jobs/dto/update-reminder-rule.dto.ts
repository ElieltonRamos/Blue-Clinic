import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class UpdateReminderRuleDto {
  @ApiPropertyOptional({ example: 'patient', enum: ['patient', 'doctor'] })
  @IsIn(['patient', 'doctor'], {
    message: "Target deve ser 'patient' ou 'doctor'.",
  })
  @IsOptional()
  target?: 'patient' | 'doctor';

  @ApiPropertyOptional({ example: 1 })
  @IsInt({ message: 'offsetDays deve ser um número inteiro.' })
  @Min(0, { message: 'offsetDays não pode ser negativo.' })
  @IsOptional()
  offsetDays?: number;

  @ApiPropertyOptional({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'time deve estar no formato HH:mm.',
  })
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'active deve ser um booleano.' })
  @IsOptional()
  active?: boolean;
}
