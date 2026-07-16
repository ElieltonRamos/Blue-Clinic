// whatssap/whatssap.controller.ts
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
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PrismaService } from '../../core/database/prisma.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { WhatssapCoreService } from './whatssap-core.service.js';
import { WhatssapBaileysProvider } from './baileys/whatssap-baileys.provider.js';
import { SendTemplateDto } from './dto/send-template.dto.js';
import { SendMessageDto } from '../chat/dto/send-message.dto.js';
import { ChatMessageResponseDto } from '../chat/dto/chat-message-response.dto.js';

interface WhatsappWebhookStatusEntry {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errors?: { code: number; message: string }[];
}

interface WhatsappWebhookMessageEntry {
  id: string;
  from: string;
  type: 'text' | 'button';
  text?: { body: string };
  button?: { text?: string; payload?: string };
  context?: { id: string };
}

interface WhatsappWebhookBody {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: WhatsappWebhookStatusEntry[];
        messages?: WhatsappWebhookMessageEntry[];
      };
    }[];
  }[];
}

interface TestSendDto {
  phone?: string;
  text?: string;
}

@ApiTags('whatssap')
@Controller('whatssap')
export class WhatssapController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: WhatssapCoreService,
    private readonly baileysProvider: WhatssapBaileysProvider,
  ) {}

  // ---------------------------------------------------------------------
  // Webhook (Meta) — sem guard, chamado pela própria Meta
  // ---------------------------------------------------------------------

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
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
  async receiveWebhook(@Body() body: WhatsappWebhookBody): Promise<string> {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = value?.metadata?.phone_number_id;

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
      text = msg.text?.body ?? '';
    } else if (msg.type === 'button') {
      const raw = msg.button?.text ?? msg.button?.payload ?? '';
      buttonPayload = raw;
      text = this.mapButtonToText(raw);
    } else {
      return 'OK';
    }

    await this.core.handleIncomingMessage(config.companyId, {
      phone: msg.from,
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

  // ---------------------------------------------------------------------
  // Official — templates
  // ---------------------------------------------------------------------

  @Post('official/conversations/:id/send-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  async sendTemplate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: SendTemplateDto,
  ): Promise<void> {
    return this.core.sendTemplateToConversation(
      companyId,
      id,
      dto.templateName,
      dto.components,
      dto.resolvedText,
    );
  }

  @Get('official/templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar templates aprovados do WhatsApp' })
  @ApiResponse({ status: 200, description: 'Lista de templates' })
  @ApiResponse({ status: 400, description: 'WhatsApp não configurado' })
  async getTemplates(
    @CurrentUser('companyId') companyId: number,
  ): Promise<unknown> {
    return this.core.getTemplates(companyId);
  }

  // ---------------------------------------------------------------------
  // Core — envio manual (atendente) associado a uma conversa
  // ---------------------------------------------------------------------

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar mensagem como atendente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.CREATED, type: ChatMessageResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('username') username: string,
    @CurrentUser('role') role: string,
    @Body() dto: SendMessageDto,
  ): ReturnType<WhatssapCoreService['sendManualMessage']> {
    return this.core.sendManualMessage(companyId, id, dto.text, username, role);
  }

  // ---------------------------------------------------------------------
  // Test send — não persiste em ChatMessage/Conversation
  // ---------------------------------------------------------------------

  @Post('test-send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envia mensagem de teste sem persistir no banco' })
  async testSend(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: TestSendDto = {},
  ): Promise<{ wamid: string | null }> {
    const phone = dto?.phone ?? '553888663580';
    const text = dto?.text ?? 'Teste 🩺';
    return this.core.sendTestMessage(companyId, phone, text);
  }

  // ---------------------------------------------------------------------
  // Baileys
  // ---------------------------------------------------------------------

  @Post('baileys/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inicia conexão Baileys (gera QR se necessário)' })
  @ApiResponse({ status: 200, description: 'Conexão iniciada' })
  async connectBaileys(
    @CurrentUser('companyId') companyId: number,
  ): Promise<{ ok: true }> {
    await this.baileysProvider.connect(companyId);
    return { ok: true };
  }

  @Post('baileys/disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desconecta a sessão Baileys' })
  async disconnectBaileys(
    @CurrentUser('companyId') companyId: number,
  ): Promise<{ ok: true }> {
    await this.baileysProvider.disconnect(companyId);
    return { ok: true };
  }

  @Get('baileys/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status atual da conexão Baileys (para polling)' })
  async baileysStatus(
    @CurrentUser('companyId') companyId: number,
  ): Promise<unknown> {
    return this.baileysProvider.getStatus(companyId);
  }
}
