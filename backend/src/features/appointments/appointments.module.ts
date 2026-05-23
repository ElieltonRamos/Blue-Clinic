import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentTypesService } from './appointment-types.service.js';
import { AppointmentTypesController } from './appointment-types.controller.js';

@Module({
  controllers: [AppointmentsController, AppointmentTypesController],
  providers: [AppointmentsService, AppointmentTypesService],
})
export class AppointmentsModule {}
