import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { WhatssapModule } from '../whatssap/whatssap.module';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService],
  imports: [WhatssapModule],
})
export class CompanyModule {}
