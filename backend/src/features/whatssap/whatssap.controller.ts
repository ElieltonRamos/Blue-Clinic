/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';

@Controller('whatssap')
export class WhatssapController {
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
  receiveWebhook(@Body() body: any) {
    console.log('WhatsApp webhook:', JSON.stringify(body, null, 2));
    return 'OK';
  }

  @Post('test-send')
  async testSend() {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '553888663580',
          type: 'text',
          text: { body: 'Teste de envio pelo NestJS 🩺' },
        }),
      },
    );

    return response.json();
  }
}
