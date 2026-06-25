// dto/appointments-chart.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AppointmentChartDataDto {
  @ApiProperty({
    example: [10, 8, 12, 9, 11, 7, 13, 15, 10, 9, 8, 14],
    type: [Number],
  })
  agendados: number[];

  @ApiProperty({
    example: [8, 6, 10, 7, 9, 5, 11, 13, 8, 7, 6, 12],
    type: [Number],
  })
  concluidos: number[];

  @ApiProperty({
    example: [1, 2, 1, 0, 1, 2, 1, 1, 2, 1, 0, 1],
    type: [Number],
  })
  cancelados: number[];

  @ApiProperty({
    example: [1, 0, 1, 2, 1, 0, 1, 1, 0, 1, 2, 1],
    type: [Number],
  })
  reagendados: number[];
}

export class AppointmentsChartDto {
  @ApiProperty({
    example: [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ],
    type: [String],
  })
  months: string[];

  @ApiProperty({ type: () => AppointmentChartDataDto })
  data: AppointmentChartDataDto;
}
