import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LicenseSystemModule } from './features/license-system/license-system.module';

@Module({
  imports: [LicenseSystemModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
