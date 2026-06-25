import { ApiProperty } from '@nestjs/swagger';

export class AutoConfirmationDto {
  @ApiProperty({
    example: 15,
    description: 'Número de agendamentos confirmados',
  })
  confirmed: number;

  @ApiProperty({
    example: 20,
    description: 'Total de agendamentos aguardando confirmação ou no período',
  })
  total: number;
}
