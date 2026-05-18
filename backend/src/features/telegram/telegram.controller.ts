import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { DailyReportService } from './daily-report.service';

@ApiTags('Telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly dailyReportService: DailyReportService,
  ) {}

  @Post('test-report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispara o relatório diário manualmente' })
  @ApiResponse({ status: 200, description: 'Relatório enviado com sucesso' })
  @ApiResponse({ status: 500, description: 'Erro ao gerar relatório' })
  async testReport(): Promise<{ ok: boolean }> {
    await this.dailyReportService.sendDailyReport();
    return { ok: true };
  }
}
