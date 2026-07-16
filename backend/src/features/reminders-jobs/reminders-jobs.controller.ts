import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { ReminderJob } from './reminder.job.js';
import { DoctorReminderJob } from './doctor-reminder.job.js';

@Controller('whatssap')
export class RemindersJobsController {
  constructor(
    private readonly reminderJob: ReminderJob,
    private readonly doctorReminderJob: DoctorReminderJob,
  ) {}

  @Post('reminders/trigger')
  @UseGuards(JwtAuthGuard)
  async triggerReminders() {
    await this.reminderJob.triggerManually();
    return { ok: true };
  }

  @Post('doctor-reminders/trigger')
  @UseGuards(JwtAuthGuard)
  async triggerDoctorReminders() {
    await this.doctorReminderJob.triggerManually();
    return { ok: true };
  }
}
