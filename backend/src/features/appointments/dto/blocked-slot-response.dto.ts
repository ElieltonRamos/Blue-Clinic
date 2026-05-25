/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockedSlotResponseDto {
  @ApiProperty({ example: 1, description: 'ID do bloqueio' })
  id: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'ID do médico (null se for um bloqueio geral da clínica)',
    nullable: true,
  })
  doctorId: number | null;

  @ApiPropertyOptional({
    example: 'Dr. Lucas Silva',
    description: 'Nome do médico associado',
    nullable: true,
  })
  doctorName: string | null;

  @ApiProperty({
    example: 'Horário de Almoço',
    description: 'Descrição ou motivo do bloqueio',
  })
  label: string;

  @ApiProperty({ example: '12:00', description: 'Horário de início (HH:mm)' })
  startTime: string;

  @ApiProperty({ example: '13:00', description: 'Horário de término (HH:mm)' })
  endTime: string;

  @ApiProperty({ example: 'ALMOCO', description: 'Tipo de bloqueio' })
  type: string;

  @ApiProperty({ example: 'DIARIO', description: 'Padrão de recorrência' })
  recurrence: string;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Cor em formato HEX para renderização na agenda',
    nullable: true,
  })
  color: string | null;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Data de início do bloqueio (YYYY-MM-DD)',
  })
  startDate: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Data de término do bloqueio (YYYY-MM-DD)',
    nullable: true,
  })
  endDate: string | null;

  constructor(data: any) {
    this.id = data.id;
    this.doctorId = data.doctorId;
    this.doctorName = data.doctor?.name ?? null;
    this.label = data.label;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.type = data.type;
    this.recurrence = data.recurrence;
    this.color = data.color;
    this.startDate = (data.startDate as Date).toISOString().split('T')[0];
    this.endDate = data.endDate
      ? (data.endDate as Date).toISOString().split('T')[0]
      : null;
  }
}
