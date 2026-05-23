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

  @ApiPropertyOptional({
    example: '2026-05-23',
    description:
      'Data específica do bloqueio no formato YYYY-MM-DD (null se for recorrente)',
    nullable: true,
  })
  date: string | null;

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
    this.date = data.date
      ? (data.date as Date).toISOString().split('T')[0]
      : null;
  }
}
