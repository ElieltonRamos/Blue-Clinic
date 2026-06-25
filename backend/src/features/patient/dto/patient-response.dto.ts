/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientStatus } from '../../../../generated/prisma/client.js';

export class PatientResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'João da Silva' })
  name: string;

  @ApiPropertyOptional({ example: 'joao@email.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '(38) 99999-9999', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: '000.000.000-00', nullable: true })
  cpf: string | null;

  @ApiProperty({ enum: PatientStatus, example: PatientStatus.Ativo })
  status: PatientStatus;

  @ApiPropertyOptional({ example: '2024-03-15T10:00:00.000Z', nullable: true })
  lastVisit: string | null;

  constructor(patient: any) {
    this.id = patient.id;
    this.name = patient.name;
    this.email = patient.email;
    this.phone = patient.phone;
    this.cpf = patient.cpf;
    this.status = patient.status;
    this.lastVisit = patient.appointments?.[0]?.date?.toISOString() ?? null;
  }
}
