// dto/chatbot-stats.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ChatbotStatsDto {
  @ApiProperty({
    example: 72,
    description: 'Percentual de interações resolvidas pelo bot',
  })
  percent: number;

  @ApiProperty({
    example: 143,
    description: 'Total de interações resolvidas pelo bot',
  })
  botInteractions: number;

  @ApiProperty({
    example: 56,
    description: 'Total de interações que precisaram de atendimento humano',
  })
  humanInteractions: number;
}
