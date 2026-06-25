// src/license/license.controller.ts

import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import {
  LicenseStatusDto,
  LicenseTokenInfoDto,
} from './dto/response-license-system.dto';
import { LicenseSystemService } from './license-system.service';

@ApiTags('License')
@Controller('license')
export class LicenseSystemController {
  constructor(private readonly licenseService: LicenseSystemService) {}

  @Get('status')
  @ApiOperation({ summary: 'Verificar status da licença' })
  @ApiResponse({
    status: 200,
    description: 'Status da licença',
    type: LicenseStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada',
  })
  getStatus() {
    return this.licenseService.getStatus();
  }

  @Get('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar licença com servidor' })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validação',
    type: LicenseStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada',
  })
  validate() {
    return this.licenseService.validate();
  }

  @Get('info')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Informações do token de licença' })
  @ApiResponse({
    status: 200,
    description: 'Informações do token',
    type: LicenseTokenInfoDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Token não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido',
  })
  getTokenInfo() {
    return this.licenseService.getTokenInfo();
  }
}
