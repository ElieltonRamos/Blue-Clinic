import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { DoctorReminderJob } from './doctor-reminder.job.js';
import { ReminderRuleService } from './reminder-rule.service.js';
import { PatientReminderJob } from './patient-reminder.job.js';

@Controller('whatssap')
@UseGuards(JwtAuthGuard)
export class RemindersJobsController {
  constructor(
    private readonly patientReminderJob: PatientReminderJob,
    private readonly doctorReminderJob: DoctorReminderJob,
    private readonly reminderRuleService: ReminderRuleService,
  ) {}

  @Post('reminders/trigger')
  async triggerReminders() {
    await this.patientReminderJob.triggerManually();
    return { ok: true };
  }

  @Post('doctor-reminders/trigger')
  async triggerDoctorReminders() {
    await this.doctorReminderJob.triggerManually();
    return { ok: true };
  }

  @Get('reminder-rules')
  async listRules(@CurrentUser('companyId') companyId: number) {
    return this.reminderRuleService.findByCompany(companyId);
  }

  @Post('reminder-rules')
  async createRule(
    @CurrentUser('companyId') companyId: number,
    @Body() body: { offsetDays: number; time: string },
  ) {
    return this.reminderRuleService.create({
      companyId,
      offsetDays: body.offsetDays,
      time: body.time,
    });
  }

  @Patch('reminder-rules/:id')
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() body: { offsetDays?: number; time?: string; active?: boolean },
  ) {
    return this.reminderRuleService.update(id, companyId, body);
  }

  @Delete('reminder-rules/:id')
  async removeRule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    await this.reminderRuleService.remove(id, companyId);
    return { ok: true };
  }
}
