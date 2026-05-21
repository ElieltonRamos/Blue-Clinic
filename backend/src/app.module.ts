import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LicenseSystemModule } from './features/license-system/license-system.module';
import { UsersModule } from './features/users/users.module';
import { AppointmentsModule } from './features/appointments/appointments.module';

@Module({
  imports: [LicenseSystemModule, UsersModule, AppointmentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
