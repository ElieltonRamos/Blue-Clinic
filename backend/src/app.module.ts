import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LicenseSystemModule } from './features/license-system/license-system.module';
import { UsersModule } from './features/users/users.module';
import { AppointmentsModule } from './features/appointments/appointments.module';
import { PatientModule } from './features/patient/patient.module';
import { DoctorsModule } from './features/doctors/doctors.module';
import { CompanyModule } from './features/company/company.module';
import { FinanceModule } from './features/financial/finance.module';
import { ReportsModule } from './features/reports/reports.module';

@Module({
  imports: [
    LicenseSystemModule,
    UsersModule,
    AppointmentsModule,
    PatientModule,
    DoctorsModule,
    CompanyModule,
    FinanceModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
