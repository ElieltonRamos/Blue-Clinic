import { Module } from '@nestjs/common';
import { LicenseSystemService } from './license-system.service';
import { LicenseSystemController } from './license-system.controller';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LicenseSystemController],
  providers: [LicenseSystemService],
  exports: [LicenseSystemService],
})
export class LicenseSystemModule {}
