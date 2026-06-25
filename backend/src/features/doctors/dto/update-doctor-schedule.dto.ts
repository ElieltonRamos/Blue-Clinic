// update-doctor-schedule.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class UpdateDoctorScheduleDto {
  @ApiPropertyOptional({
    description: 'Dia da semana (0=Domingo, 6=Sábado)',
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt({ message: 'Dia da semana deve ser um número inteiro' })
  @Min(0, { message: 'Dia da semana deve ser entre 0 e 6' })
  @Max(6, { message: 'Dia da semana deve ser entre 0 e 6' })
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Horário de início (HH:mm)',
    example: '08:00',
  })
  @IsOptional()
  @IsString({ message: 'Horário de início deve ser uma string' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'Horário de início deve estar no formato HH:mm',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Horário de término (HH:mm)',
    example: '18:00',
  })
  @IsOptional()
  @IsString({ message: 'Horário de término deve ser uma string' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'Horário de término deve estar no formato HH:mm',
  })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Ativo' })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser verdadeiro ou falso' })
  active?: boolean;
}
