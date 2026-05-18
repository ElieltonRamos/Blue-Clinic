import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { DailyReportService } from './daily-report.service';
import { PrismaModule } from '../database/prisma.module';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [PrismaModule],
  providers: [TelegramService, DailyReportService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
