// src/license/dto/license-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class LicenseStatusDto {
  @ApiProperty({
    description: 'Indica se a licença é válida',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Plano da licença',
    enum: ['basic', 'pro', 'none'],
    example: 'pro',
  })
  plan: 'basic' | 'pro' | 'none';
}

export class LicenseTokenInfoDto {
  @ApiProperty({
    description: 'ID da empresa',
    example: 1,
  })
  companyId: number;

  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12345678000199',
  })
  cnpj: string;

  @ApiProperty({
    description: 'Plano da licença',
    enum: ['basic', 'pro'],
    example: 'pro',
  })
  plan: 'basic' | 'pro';

  @ApiProperty({
    description: 'Data de validade da licença (timestamp em ms)',
    example: 1735689600000,
  })
  licenseValidUntil: number;

  @ApiProperty({
    description: 'Máximo de dias offline permitidos',
    example: 7,
  })
  maxOfflineDays: number;

  @ApiProperty({
    description: 'Data de emissão do token (timestamp em segundos)',
    example: 1704067200,
  })
  iat: number;

  @ApiProperty({
    description: 'Data de expiração do token (timestamp em segundos)',
    example: 1704672000,
  })
  exp: number;
}
