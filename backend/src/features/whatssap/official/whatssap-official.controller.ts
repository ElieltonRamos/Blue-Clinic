/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// official/whatssap-official.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  UseGuards,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { WhatssapCoreService } from '../whatssap-core.service.js';
import { WhatssapProviderRegistry } from '../whatssap-provider.registry.js';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { SendTemplateDto } from '../dto/send-template.dto.js';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('whatssap')
export class WhatssapOfficialController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: WhatssapCoreService,
    private readonly registry: WhatssapProviderRegistry,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const VERIFY_TOKEN =
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'blueclinic_webhook_2024';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  @HttpCode(200)
  async receiveWebhook(@Body() body: any) {
    const entry = body?.entry?.[0];
    const value = entry?.changes?.[0]?.value;
    const phoneNumberId = value?.metadata?.phone_number_id as string;

    if (!phoneNumberId) return 'OK';

    const config = await this.prisma.client.whatsappConfig.findFirst({
      where: { phoneNumberId },
      select: { companyId: true, botEnabled: true },
    });

    if (!config) return 'OK';

    if (value?.statuses?.length) {
      const status = value.statuses[0];
      await this.core.handleMessageStatus(
        config.companyId,
        status.id,
        status.status,
        status.errors?.[0]?.code,
        status.errors?.[0]?.message,
      );
      return 'OK';
    }

    if (!value?.messages?.length) return 'OK';
    const msg = value.messages[0];

    let text: string;
    let buttonPayload: string | undefined;

    if (msg.type === 'text') {
      text = msg.text.body as string;
    } else if (msg.type === 'button') {
      const raw = (msg.button?.text ?? msg.button?.payload ?? '') as string;
      buttonPayload = raw;
      text = this.mapButtonToText(raw);
    } else {
      return 'OK';
    }

    await this.core.handleIncomingMessage(config.companyId, {
      phone: msg.from as string,
      text,
      wamid: msg.id,
      buttonPayload,
      contextWamid: msg.context?.id,
    });

    return 'OK';
  }

  private mapButtonToText(buttonValue: string): string {
    const normalized = buttonValue.trim().toLowerCase();
    if (normalized === 'confirmar') return '1';
    if (normalized === 'cancelar') return '2';
    return buttonValue;
  }

  @Post('test-send')
  @UseGuards(JwtAuthGuard)
  async testSend(@CurrentUser('companyId') companyId: number) {
    const provider = await this.registry.getProvider(companyId);
    await provider.sendText(companyId, '553888663580', 'Teste 🩺');
    return { ok: true };
  }

  @Post('conversations/:id/send-template')
  @UseGuards(JwtAuthGuard)
  async sendTemplate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: SendTemplateDto,
  ) {
    return this.core.sendTemplateToConversation(
      companyId,
      id,
      dto.templateName,
      dto.components,
      dto.resolvedText,
    );
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar templates aprovados do WhatsApp' })
  @ApiResponse({ status: 200, description: 'Lista de templates' })
  @ApiResponse({ status: 400, description: 'WhatsApp não configurado' })
  async getTemplates(@CurrentUser('companyId') companyId: number) {
    const provider = await this.registry.getProvider(companyId);
    if (!provider.getTemplates) {
      throw new Error('Provider atual não suporta templates');
    }
    return provider.getTemplates(companyId);
  }
}
