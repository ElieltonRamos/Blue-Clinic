// dto/dashboard-stats.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 12, description: 'Total de consultas hoje' })
  totalConsultasHoje: number;

  @ApiProperty({
    example: 20,
    description: 'Variação percentual em relação ao dia anterior',
  })
  totalConsultasHojeTrend: number;

  @ApiProperty({ example: 14250.0, description: 'Receita total do mês atual' })
  receitaMensal: number;

  @ApiProperty({
    example: 12,
    description: 'Variação percentual em relação ao mês anterior',
  })
  receitaMensalTrend: number;

  @ApiProperty({
    example: 8.5,
    description: 'Taxa de faltas do mês atual em percentual',
  })
  taxaFaltas: number;

  @ApiProperty({
    example: -2,
    description: 'Variação percentual da taxa de faltas',
  })
  taxaFaltasTrend: number;

  @ApiProperty({
    example: 5,
    description: 'Conversas WhatsApp ativas no momento',
  })
  chatsAtivos: number;
}
