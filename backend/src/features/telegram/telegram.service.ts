import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = '8687588360:AAGB0cqexvBOJAe8yrfiNAEQRH8DwAKApJM';
  private readonly chatId = '2065604642';

  async sendMessage(text: string): Promise<void> {
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        { chat_id: this.chatId, text, parse_mode: 'HTML' },
      );
    } catch (error) {
      this.logger.error('Falha ao enviar mensagem Telegram', error);
    }
  }
}
