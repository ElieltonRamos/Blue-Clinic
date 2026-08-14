import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../core/database/prisma.service.js';
import { PatientReminderJob } from './patient-reminder.job.js';
import { DoctorReminderJob } from './doctor-reminder.job.js';

type ReminderTarget = 'patient' | 'doctor';

@Injectable()
export class ReminderRuleService implements OnModuleInit {
  private readonly logger = new Logger(ReminderRuleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly patientReminderJob: PatientReminderJob,
    private readonly doctorReminderJob: DoctorReminderJob,
  ) {}

  async onModuleInit(): Promise<void> {
    const rules = await this.prisma.client.reminderRule.findMany({
      where: { active: true },
    });
    for (const rule of rules) {
      this.registerJob(rule.id, rule.time, rule.target as ReminderTarget);
    }
    this.logger.log(
      `[REMINDER-RULES] ${rules.length} job(s) registrado(s) no boot`,
    );
  }

  private jobName(ruleId: number): string {
    return `reminder-rule-${ruleId}`;
  }

  private buildCronExpression(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    return `${minute} ${hour} * * *`;
  }

  private registerJob(
    ruleId: number,
    time: string,
    target: ReminderTarget,
  ): void {
    const name = this.jobName(ruleId);
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }

    const job = new CronJob(this.buildCronExpression(time), () => {
      const runner =
        target === 'doctor'
          ? this.doctorReminderJob.triggerForRule(ruleId)
          : this.patientReminderJob.triggerForRule(ruleId);

      runner.catch((err) => {
        this.logger.error(
          `[REMINDER-RULES] Falha ao executar rule ${ruleId} (${target})`,
          err,
        );
      });
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  private unregisterJob(ruleId: number): void {
    const name = this.jobName(ruleId);
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }
  }

  async create(data: {
    companyId: number;
    target: ReminderTarget;
    offsetDays: number;
    time: string;
  }) {
    const rule = await this.prisma.client.reminderRule.create({ data });
    this.registerJob(rule.id, rule.time, rule.target as ReminderTarget);
    return rule;
  }

  async update(
    id: number,
    companyId: number,
    data: {
      target?: ReminderTarget;
      offsetDays?: number;
      time?: string;
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.client.reminderRule.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada');

    const rule = await this.prisma.client.reminderRule.update({
      where: { id },
      data,
    });

    if (!rule.active) {
      this.unregisterJob(rule.id);
    } else {
      this.registerJob(rule.id, rule.time, rule.target as ReminderTarget);
    }

    return rule;
  }

  async remove(id: number, companyId: number): Promise<void> {
    const existing = await this.prisma.client.reminderRule.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Regra não encontrada');

    await this.prisma.client.reminderRule.delete({ where: { id } });
    this.unregisterJob(id);
  }

  findByCompany(companyId: number) {
    return this.prisma.client.reminderRule.findMany({ where: { companyId } });
  }
}
