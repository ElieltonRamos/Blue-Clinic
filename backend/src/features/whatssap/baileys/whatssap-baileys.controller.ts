// baileys/whatssap-baileys.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';
import { WhatssapBaileysProvider } from './whatssap-baileys.provider.js';

@ApiTags('whatsapp-baileys')
@Controller('whatsapp/baileys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WhatssapBaileysController {
  constructor(private readonly baileysProvider: WhatssapBaileysProvider) {}

  @Post('connect')
  @ApiOperation({ summary: 'Inicia conexão Baileys (gera QR se necessário)' })
  @ApiResponse({ status: 200, description: 'Conexão iniciada' })
  async connect(@CurrentUser('companyId') companyId: number) {
    await this.baileysProvider.connect(companyId);
    return { ok: true };
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Desconecta a sessão Baileys' })
  async disconnect(@CurrentUser('companyId') companyId: number) {
    await this.baileysProvider.disconnect(companyId);
    return { ok: true };
  }

  @Get('status')
  @ApiOperation({ summary: 'Status atual da conexão Baileys (para polling)' })
  async status(@CurrentUser('companyId') companyId: number) {
    return this.baileysProvider.getStatus(companyId);
  }
}
