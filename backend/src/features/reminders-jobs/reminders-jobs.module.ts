import { Module } from '@nestjs/common';
import { DoctorReminderJob } from './doctor-reminder.job';
import { ReminderJob } from './reminder.job';
import { WhatssapModule } from '../whatssap/whatssap.module';
import { ChatModule } from '../chat/chat.module';
import { RemindersJobsController } from './reminders-jobs.controller';

@Module({
  controllers: [RemindersJobsController],
  providers: [DoctorReminderJob, ReminderJob],
  imports: [WhatssapModule, ChatModule],
})
export class RemindersJobsModule {}
