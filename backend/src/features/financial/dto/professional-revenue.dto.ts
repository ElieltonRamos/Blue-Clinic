// professional-revenue.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalRevenueDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Dr. Ricardo Silva' })
  name: string;

  @ApiProperty({
    example: '👨‍⚕️',
    description: 'URL do avatar ou emoji fallback',
  })
  avatar: string;

  @ApiProperty({ example: 8450.0 })
  value: number;
}
