/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// appointment-type-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AppointmentTypeResponseDto {
  @ApiProperty({ example: 1, description: 'ID do tipo de consulta' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID da clínica/empresa' })
  companyId: number;

  @ApiProperty({
    example: 'Consulta de Rotina',
    description: 'Nome do tipo de consulta',
  })
  name: string;

  @ApiProperty({ example: 30, description: 'Duração em minutos' })
  duration: number;

  @ApiProperty({ example: true, description: 'Indica se está ativo' })
  active: boolean;

  @ApiProperty({
    example: '2026-05-23T10:00:00.000Z',
    description: 'Data de criação',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-05-23T10:00:00.000Z',
    description: 'Data da última atualização',
  })
  updatedAt: Date;

  constructor(t: any) {
    this.id = t.id;
    this.companyId = t.companyId;
    this.name = t.name;
    this.duration = t.duration;
    this.active = t.active;
    this.createdAt = t.createdAt;
    this.updatedAt = t.updatedAt;
  }
}
