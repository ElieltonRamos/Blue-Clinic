/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientStatus } from '../../../../generated/prisma/enums';

export class ConsultationHistoryDto {
  @ApiProperty({ example: 'Consulta de Rotina' })
  title: string;

  @ApiProperty({ example: '2024-03-15T10:00:00.000Z' })
  date: string;

  @ApiProperty({ example: 'Dr. Carlos Silva' })
  doctor: string;

  @ApiPropertyOptional({ example: 'Paciente sem queixas.' })
  notes: string | null;

  @ApiProperty({ example: true })
  active: boolean;
}

export class PatientDocumentDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'exame-sangue.pdf' })
  name: string;

  @ApiProperty({ example: '2.4 MB' })
  size: string;

  @ApiProperty({ example: 'pdf' })
  type: string;

  @ApiProperty({ example: 'https://storage.example.com/exame.pdf' })
  url: string;
}

export class NextAppointmentDto {
  @ApiProperty({ example: '2024-04-20T00:00:00.000Z' })
  date: string;

  @ApiProperty({ example: '14:30' })
  startTime: string;
}

export class PatientDetailResponseDto {
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

  @ApiPropertyOptional({ example: '1990-05-20T00:00:00.000Z', nullable: true })
  birthDate: string | null;

  @ApiProperty({ enum: PatientStatus, example: PatientStatus.Ativo })
  status: PatientStatus;

  @ApiProperty({ example: false })
  blocked: boolean;

  @ApiProperty({ example: '2023-01-10T00:00:00.000Z' })
  memberSince: string;

  @ApiProperty({ example: true })
  whatsappActive: boolean;

  @ApiProperty({ example: true })
  lgpdConsent: boolean;

  @ApiProperty({ type: [ConsultationHistoryDto] })
  consultationHistory: ConsultationHistoryDto[];

  @ApiProperty({ type: [PatientDocumentDto] })
  documents: PatientDocumentDto[];

  @ApiPropertyOptional({ type: NextAppointmentDto, nullable: true })
  nextAppointment: NextAppointmentDto | null;

  constructor(patient: any) {
    const now = new Date();

    this.id = patient.id;
    this.name = patient.name;
    this.email = patient.email;
    this.phone = patient.phone;
    this.cpf = patient.cpf;
    this.birthDate = patient.birthDate?.toISOString() ?? null;
    this.status = patient.status;
    this.blocked = patient.blocked;
    this.memberSince = patient.memberSince.toISOString();
    this.whatsappActive = patient.whatsappActive;
    this.lgpdConsent = patient.lgpdConsent;

    this.consultationHistory = patient.appointments.map((a: any) => ({
      title: a.consultation?.title ?? a.appointmentType?.name ?? 'Consulta',
      date: a.date.toISOString(),
      doctor: a.doctor.name,
      notes: a.consultation?.notes ?? null,
      active: a.status === 'finished',
    }));

    this.documents = patient.documents.map((d: any) => ({
      id: d.id,
      name: d.name,
      size: d.size,
      type: d.type,
      url: d.url,
    }));

    const next = patient.appointments.find(
      (a: any) => new Date(a.date) >= now && a.status !== 'cancelled',
    );

    this.nextAppointment = next
      ? { date: next.date.toISOString(), startTime: next.startTime }
      : null;
  }
}
