/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionType } from '../../../../generated/prisma/client.js';

export class DoctorUserDto {
  @ApiProperty({ description: 'ID do usuário' }) id: number;
  @ApiProperty({ description: 'Nome de usuário' }) username: string;
  @ApiProperty({ description: 'Papel do usuário' }) role: string;
  @ApiProperty({ description: 'Usuário ativo' }) active: boolean;
}

export class DoctorScheduleSummaryDto {
  @ApiProperty({ description: 'ID do horário' }) id: number;
  @ApiProperty({ description: 'Dia da semana (0=Dom, 6=Sáb)' })
  dayOfWeek: number;
  @ApiProperty({ description: 'Hora de início (HH:mm)' }) startTime: string;
  @ApiProperty({ description: 'Hora de término (HH:mm)' }) endTime: string;
  @ApiProperty({ description: 'Horário ativo' }) active: boolean;
}

export class AppointmentTypeSummaryDto {
  @ApiProperty({ description: 'ID do tipo de consulta' }) id: number;
  @ApiProperty({ description: 'Nome do tipo de consulta' }) name: string;
  @ApiProperty({ description: 'Duração em minutos' }) duration: number;
}

export class DoctorCommissionSummaryDto {
  @ApiProperty({ description: 'ID da comissão' }) id: number;
  @ApiProperty({ description: 'ID do tipo de consulta' })
  appointmentTypeId: number;
  @ApiProperty({
    enum: CommissionType,
    description: 'Tipo de comissão do médico',
  })
  doctorRateType: CommissionType;
  @ApiProperty({ description: 'Taxa do médico' }) doctorRate: number;
  @ApiProperty({
    enum: CommissionType,
    description: 'Tipo de comissão da clínica',
  })
  clinicRateType: CommissionType;
  @ApiProperty({ description: 'Taxa da clínica' }) clinicRate: number;
  @ApiProperty({ description: 'Preço cobrado do paciente' }) price: number;
  @ApiProperty({
    type: () => AppointmentTypeSummaryDto,
    description: 'Tipo de consulta',
  })
  appointmentType: AppointmentTypeSummaryDto;
}

export class DoctorResponseDto {
  @ApiProperty({ description: 'ID do médico' }) id: number;
  @ApiProperty({ description: 'ID da empresa' }) companyId: number;
  @ApiPropertyOptional({ description: 'ID do usuário vinculado' }) userId?:
    | number
    | null;
  @ApiProperty({ description: 'Nome do médico' }) name: string;
  @ApiProperty({ description: 'Especialidade' }) specialty: string;
  @ApiPropertyOptional({ description: 'URL do avatar' }) avatarUrl?:
    | string
    | null;
  @ApiProperty({ description: 'Médico ativo' }) active: boolean;
  @ApiPropertyOptional({
    type: () => DoctorUserDto,
    description: 'Usuário vinculado',
  })
  user?: DoctorUserDto | null;
  @ApiProperty({
    type: () => [DoctorScheduleSummaryDto],
    description: 'Horários de atendimento',
  })
  schedules: DoctorScheduleSummaryDto[];
  @ApiProperty({
    type: () => [DoctorCommissionSummaryDto],
    description: 'Comissões por tipo de consulta',
  })
  commissions: DoctorCommissionSummaryDto[];
  @ApiProperty({ description: 'Data de criação' }) createdAt: Date;
  @ApiProperty({ description: 'Data de atualização' }) updatedAt: Date;

  constructor(partial: Record<string, any>) {
    this.id = partial['id'];
    this.companyId = partial['companyId'];
    this.userId = partial['userId'] ?? null;
    this.name = partial['name'];
    this.specialty = partial['specialty'];
    this.avatarUrl = partial['avatarUrl'] ?? null;
    this.active = partial['active'];
    this.user = partial['user'] ?? null;
    this.createdAt = partial['createdAt'];
    this.updatedAt = partial['updatedAt'];

    this.schedules = (partial['doctorSchedules'] ?? []).map(
      (s: Record<string, any>) => ({
        id: s['id'],
        dayOfWeek: s['dayOfWeek'],
        startTime: s['startTime'],
        endTime: s['endTime'],
        active: s['active'],
      }),
    );

    this.commissions = (partial['appointmentTypeCommissions'] ?? []).map(
      (c: Record<string, any>) => ({
        id: c['id'],
        appointmentTypeId: c['appointmentTypeId'],
        doctorRateType: c['doctorRateType'],
        doctorRate: Number(c['doctorRate']),
        clinicRateType: c['clinicRateType'],
        clinicRate: Number(c['clinicRate']),
        price: Number(c['price']),
        appointmentType: c['appointmentType'],
      }),
    );
  }
}
