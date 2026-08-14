import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Matches, Min } from 'class-validator';

export class CreateReminderRuleDto {
  @ApiProperty({ example: 'patient', enum: ['patient', 'doctor'] })
  @IsIn(['patient', 'doctor'], {
    message: "Target deve ser 'patient' ou 'doctor'.",
  })
  target: 'patient' | 'doctor';

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'offsetDays deve ser um número inteiro.' })
  @Min(0, { message: 'offsetDays não pode ser negativo.' })
  offsetDays: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'time deve estar no formato HH:mm.',
  })
  time: string;
}
