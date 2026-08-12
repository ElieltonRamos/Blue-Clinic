import { Module } from '@nestjs/common';
import { DoctorReminderJob } from './doctor-reminder.job';
import { PatientReminderJob } from './patient-reminder.job';
import { WhatssapModule } from '../whatssap/whatssap.module';
import { ChatModule } from '../chat/chat.module';
import { RemindersJobsController } from './reminders-jobs.controller';
import { ReminderRuleService } from './reminder-rule.service';

@Module({
  controllers: [RemindersJobsController],
  providers: [DoctorReminderJob, PatientReminderJob, ReminderRuleService],
  imports: [WhatssapModule, ChatModule],
})
export class RemindersJobsModule {}
