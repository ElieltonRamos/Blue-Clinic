/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentResponseDto {
  @ApiProperty({ example: '1', description: 'ID do agendamento' })
  id: string;

  @ApiProperty({ example: '10', description: 'ID do médico' })
  doctorId: string;

  @ApiProperty({ example: 'João da Silva', description: 'Nome do paciente' })
  patientName: string;

  @ApiProperty({ example: '5', description: 'ID do paciente' })
  patientId: string;

  @ApiProperty({
    example: 'Cardiologia',
    description: 'Especialidade do atendimento',
  })
  specialty: string;

  @ApiProperty({
    example: '2026-05-23',
    description: 'Data do agendamento no formato YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({ example: '08:00', description: 'Horário de início' })
  startTime: string;

  @ApiProperty({ example: '08:30', description: 'Horário de término' })
  endTime: string;

  @ApiProperty({ example: 'confirmed', description: 'Status do agendamento' })
  status: string;

  @ApiPropertyOptional({
    example: 'Maria Oliveira',
    description: 'Nome do responsável pelo paciente',
  })
  responsible?: string;

  @ApiPropertyOptional({ example: 150.0, description: 'Valor da consulta' })
  price?: number;

  @ApiPropertyOptional({
    example: 'Paciente não compareceu',
    description: 'Motivo do cancelamento ou remarcação',
  })
  cancellationReason?: string;

  constructor(data: any) {
    this.id = String(data.id);
    this.doctorId = String(data.doctorId);
    this.patientName = data.patient?.name;
    this.patientId = String(data.patient?.id);
    this.specialty = data.specialty;
    this.date = data.date.toISOString().split('T')[0];
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.status = data.status;
    this.responsible = data.responsible ?? undefined;
    this.price =
      data.feeOverride != null ? Number(data.feeOverride) : undefined;
    this.cancellationReason = data.cancellationReason ?? undefined;
  }
}
