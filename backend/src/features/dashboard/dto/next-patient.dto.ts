// dto/next-patient.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class NextPatientAppointmentTypeDto {
  @ApiProperty({ example: 'Consulta Geral' })
  name: string;
}

class NextPatientPatientDto {
  @ApiProperty({ example: 'Maria Souza' })
  name: string;
}

export class NextPatientDto {
  @ApiProperty({ example: '10:30' })
  startTime: string;

  @ApiProperty({ type: () => NextPatientPatientDto })
  patient: NextPatientPatientDto;

  @ApiPropertyOptional({
    type: () => NextPatientAppointmentTypeDto,
    nullable: true,
  })
  appointmentType: NextPatientAppointmentTypeDto | null;
}
