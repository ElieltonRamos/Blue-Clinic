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
import { WhatssapService } from './whatssap.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { SendTemplateDto } from './dto/send-template.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('whatssap')
export class WhatssapController {
  constructor(private readonly whatssapService: WhatssapService) {}

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
    await this.whatssapService.processWebhook(body);
    return 'OK';
  }

  @Post('test-send')
  @UseGuards(JwtAuthGuard)
  async testSend(@CurrentUser('companyId') companyId: number) {
    return this.whatssapService.testSend(companyId);
  }

  @Post('conversations/:id/send-template')
  @UseGuards(JwtAuthGuard)
  async sendTemplate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: SendTemplateDto,
  ) {
    return this.whatssapService.sendTemplateToConversation(
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
    return this.whatssapService.getTemplates(companyId);
  }
}
