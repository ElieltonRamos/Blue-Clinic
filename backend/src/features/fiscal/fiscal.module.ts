import { Module } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { FiscalController } from './fiscal.controller';
import { FiscalReportsController } from './fiscal-reports.controller';

@Module({
  controllers: [FiscalController, FiscalReportsController],
  providers: [FiscalService],
})
export class FiscalModule {}
