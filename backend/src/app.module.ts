import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LicenseSystemModule } from './features/license-system/license-system.module';
import { UsersModule } from './features/users/users.module';

@Module({
  imports: [LicenseSystemModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
