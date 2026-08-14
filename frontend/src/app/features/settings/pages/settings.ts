import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingsService } from '../services/settings.service';
import { version } from '../../../../../package.json';
import * as QRCode from 'qrcode';
import { ReminderRule, ReminderTarget, WhatsappProviderType } from '../types/settings.types';
import {
  CompanyData,
  IntegrationStatus,
  NewMemberForm,
  TeamMember,
  UpsertIntegrationDto,
  UserLevel,
} from '../types/settings.types';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { FormField, ModalEditEntity } from '../../../shared/modal-edit-entity/modal-edit-entity';
import { alertConfirm } from '../../../shared/alerts/custom-alerts';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalEditEntity],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  private settingsService = inject(SettingsService);
  private notification = inject(NotificationService);
  private auth = inject(AuthService);

  isAdmin = signal(false);

  version = version;
  members = signal<TeamMember[]>([]);
  companyData = signal<CompanyData | null>(null);
  integration = signal<IntegrationStatus | null>(null);

  memberFilter = signal('');
  roleFilter = signal<UserLevel | ''>('');

  companySaved = signal(false);
  loading = signal(false);

  showCreateModal = signal(false);
  newMember = signal<Partial<NewMemberForm>>({});

  showEditModal = signal(false);
  editMember = signal<Partial<NewMemberForm & { active: string }>>({});
  editMemberId = signal<number | null>(null);

  integrationForm = signal<UpsertIntegrationDto>({});
  integrationSaved = signal(false);

  baileysQr = signal<string | null>(null);
  baileysStatus = signal<string | null>(null);
  private baileysPolling: ReturnType<typeof setInterval> | null = null;

  integrationToggles: {
    key: keyof Pick<UpsertIntegrationDto, 'botEnabled' | 'autoReminder'>;
    label: string;
  }[] = [
    { key: 'botEnabled', label: 'Bot ativo' },
    { key: 'autoReminder', label: 'Lembrete automático' },
  ];
  private originalCompany: CompanyData | null = null;

  reminderRules = signal<ReminderRule[]>([]);
  patientRules = computed(() => this.reminderRules().filter((r) => r.target === 'patient'));
  doctorRules = computed(() => this.reminderRules().filter((r) => r.target === 'doctor'));

  showCreateRuleModal = signal(false);
  newRule = signal<Partial<{ offsetDays: number; time: string }>>({});
  newRuleTarget = signal<ReminderTarget>('patient');

  showEditRuleModal = signal(false);
  editRule = signal<Partial<{ offsetDays: number; time: string; active: string }>>({});
  editRuleId = signal<number | null>(null);

  private readonly TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

  // memberCreateFields vai precisar de name e specialty condicionais ao role medico
  memberCreateFields: FormField[] = [
    {
      name: 'username',
      label: 'Usuário (login)',
      type: 'text',
      placeholder: 'Ex: dr.joao',
      required: true,
    },
    {
      name: 'password',
      label: 'Senha',
      type: 'password',
      placeholder: 'Mínimo 6 caracteres',
      required: true,
    },
    {
      name: 'role',
      label: 'Nível de Acesso',
      type: 'select',
      options: ['medico', 'atendimento', 'admin'],
    },
    {
      name: 'name',
      label: 'Nome completo',
      type: 'text',
      placeholder: 'Ex: Dr. João Silva',
      required: true,
      visibleWhen: (e) => e.role === 'medico',
    },
    {
      name: 'specialty',
      label: 'Especialidade',
      type: 'text',
      placeholder: 'Ex: Cardiologia',
      required: true,
      visibleWhen: (e) => e.role === 'medico',
    },
    {
      name: 'phone',
      label: 'Telefone (WhatsApp)',
      type: 'text',
      placeholder: 'Ex: 5538900000000',
    },
  ];

  memberEditFields: FormField[] = [
    { name: 'username', label: 'Usuário (login)', type: 'text', placeholder: 'Ex: dr.joao' },
    {
      name: 'password',
      label: 'Nova Senha',
      type: 'password',
      placeholder: 'Deixe vazio para manter',
    },
    {
      name: 'phone',
      label: 'Telefone (WhatsApp)',
      type: 'text',
      placeholder: 'Ex: 5538900000000',
    },
    {
      name: 'role',
      label: 'Nível de Acesso',
      type: 'select',
      options: ['medico', 'atendimento', 'admin'],
    },
    { name: 'active', label: 'Status', type: 'select', options: ['Ativo', 'Inativo'] },
  ];

  reminderRuleCreateFields: FormField[] = [
    {
      name: 'offsetDays',
      label: 'Dias antes da consulta',
      type: 'number',
      placeholder: 'Ex: 0 = mesmo dia, 1 = 1 dia antes, 3 = 3 dias antes',
      required: true,
    },
    {
      name: 'time',
      label: 'Horário de envio (HH:mm)',
      type: 'text',
      placeholder: 'Ex: 14:30',
      required: true,
    },
  ];

  reminderRuleEditFields: FormField[] = [
    {
      name: 'offsetDays',
      label: 'Dias antes da consulta',
      type: 'number',
      placeholder: 'Ex: 0 = mesmo dia, 1 = 1 dia antes, 3 = 3 dias antes',
    },
    {
      name: 'time',
      label: 'Horário de envio (HH:mm)',
      type: 'text',
      placeholder: 'Ex: 14:30',
    },
    { name: 'active', label: 'Status', type: 'select', options: ['Ativo', 'Inativo'] },
  ];

  ngOnInit(): void {
    this.isAdmin.set(this.auth.getTokenPayload()?.role === 'admin');
    this.loadMembers();
    this.loadCompany();
    this.loadIntegration();
    this.loadReminderRules();
  }

  private loadReminderRules(): void {
    this.settingsService.getReminderRules().subscribe({
      next: (rules) => this.reminderRules.set(rules),
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar regras de lembrete.'));
      },
    });
  }

  ruleOffsetLabel(offsetDays: number): string {
    if (offsetDays === 0) return 'No dia da consulta';
    if (offsetDays === 1) return '1 dia antes';
    return `${offsetDays} dias antes`;
  }

  openCreateRuleModal(target: ReminderTarget): void {
    this.newRuleTarget.set(target);
    this.newRule.set({});
    this.showCreateRuleModal.set(true);
  }

  onSaveRule(entity: Partial<{ offsetDays: number; time: string }>): void {
    const offsetDays = Number(entity.offsetDays);
    const time = entity.time?.trim() ?? '';

    if (Number.isNaN(offsetDays) || offsetDays < 0) {
      this.notification.warning('Informe um número de dias válido (0 ou maior).');
      return;
    }
    if (!this.TIME_REGEX.test(time)) {
      this.notification.warning('Informe um horário válido no formato HH:mm.');
      return;
    }

    this.settingsService
      .createReminderRule({ target: this.newRuleTarget(), offsetDays, time })
      .subscribe({
        next: (rule) => {
          this.reminderRules.update((list) => [...list, rule]);
          this.showCreateRuleModal.set(false);
          this.notification.success('Regra de lembrete criada com sucesso.');
        },
        error: (err: HttpErrorResponse) => {
          this.notification.error(this.getErrorMessage(err, 'Erro ao criar regra de lembrete.'));
        },
      });
  }

  openEditRuleModal(rule: ReminderRule): void {
    this.editRuleId.set(rule.id);
    this.editRule.set({
      offsetDays: rule.offsetDays,
      time: rule.time,
      active: rule.active ? 'Ativo' : 'Inativo',
    });
    this.showEditRuleModal.set(true);
  }

  onUpdateRule(entity: Partial<{ offsetDays: number; time: string; active: string }>): void {
    const id = this.editRuleId();
    if (!id) return;

    const dto: Record<string, unknown> = {};

    if (entity.offsetDays !== undefined) {
      const offsetDays = Number(entity.offsetDays);
      if (Number.isNaN(offsetDays) || offsetDays < 0) {
        this.notification.warning('Informe um número de dias válido (0 ou maior).');
        return;
      }
      dto['offsetDays'] = offsetDays;
    }

    if (entity.time !== undefined) {
      const time = entity.time.trim();
      if (!this.TIME_REGEX.test(time)) {
        this.notification.warning('Informe um horário válido no formato HH:mm.');
        return;
      }
      dto['time'] = time;
    }

    if (entity.active !== undefined) dto['active'] = entity.active === 'Ativo';

    this.settingsService.updateReminderRule(id, dto as any).subscribe({
      next: (updated) => {
        this.reminderRules.update((list) => list.map((r) => (r.id === id ? updated : r)));
        this.showEditRuleModal.set(false);
        this.notification.success('Regra de lembrete atualizada com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar regra de lembrete.'));
      },
    });
  }

  toggleRuleActive(rule: ReminderRule, active: boolean): void {
    this.settingsService.updateReminderRule(rule.id, { active }).subscribe({
      next: (updated) => {
        this.reminderRules.update((list) => list.map((r) => (r.id === rule.id ? updated : r)));
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar regra de lembrete.'));
      },
    });
  }

  async removeRule(id: number): Promise<void> {
    const confirmed = await alertConfirm('Deseja remover esta regra de lembrete?');
    if (!confirmed) return;

    this.settingsService.removeReminderRule(id).subscribe({
      next: () => {
        this.reminderRules.update((list) => list.filter((r) => r.id !== id));
        this.notification.success('Regra removida com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao remover regra de lembrete.'));
      },
    });
  }

  onProviderChange(provider: WhatsappProviderType): void {
    this.integrationForm.update((f) => ({ ...f, provider }));

    this.stopBaileysPolling();
    this.baileysQr.set(null);
    this.baileysStatus.set(null);

    if (provider === 'baileys') {
      this.settingsService.connectBaileys().subscribe({
        next: () => this.startBaileysPolling(),
        error: (err: HttpErrorResponse) => {
          this.notification.error(this.getErrorMessage(err, 'Erro ao iniciar conexão Baileys.'));
        },
      });
    }
  }

  private startBaileysPolling(): void {
    this.baileysPolling = setInterval(() => {
      this.settingsService.getBaileysStatus().subscribe({
        next: async (res) => {
          this.baileysStatus.set(res.status);

          if (res.qr) {
            this.baileysQr.set(await QRCode.toDataURL(res.qr));
          } else {
            this.baileysQr.set(null);
          }

          if (res.status === 'connected') {
            this.stopBaileysPolling();
            this.notification.success('WhatsApp conectado com sucesso.');
          }
        },
        error: () => this.stopBaileysPolling(),
      });
    }, 2000);
  }

  private stopBaileysPolling(): void {
    if (this.baileysPolling) {
      clearInterval(this.baileysPolling);
      this.baileysPolling = null;
    }
  }

  ngOnDestroy(): void {
    this.stopBaileysPolling();
  }

  loadMembers(): void {
    this.settingsService
      .getUsers({
        username: this.memberFilter() || undefined,
        role: this.roleFilter() || undefined,
      })
      .subscribe({
        next: (members) => this.members.set(members),
        error: (err: HttpErrorResponse) => {
          this.notification.error(this.getErrorMessage(err, 'Erro ao carregar membros.'));
        },
      });
  }

  onFilterChange(): void {
    this.loadMembers();
  }

  private loadCompany(): void {
    this.settingsService.getCompany().subscribe({
      next: (company) => {
        this.companyData.set(company);
        this.originalCompany = { ...company };
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar dados da empresa.'));
      },
    });
  }

  private loadIntegration(): void {
    this.settingsService.getIntegration().subscribe({
      next: (integration) => {
        this.integration.set(integration);
        if (integration) {
          this.integrationForm.set({
            provider: integration.provider,
            phoneNumberId: integration.phoneNumberId ?? undefined,
            whatsappBusinessAccountId: integration.whatsappBusinessAccountId ?? undefined,
            botEnabled: integration.botEnabled,
            autoReminder: integration.autoReminder,
          });
        }

        if (integration?.provider === 'baileys') {
          this.startBaileysPolling();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar integração.'));
      },
    });
  }

  levelLabel(level: UserLevel): string {
    return { medico: 'Médico', atendimento: 'Atendimento', admin: 'Admin' }[level];
  }

  levelClass(level: UserLevel): string {
    return {
      medico: 'bg-(--color-primary-subtle) text-(--color-primary-text)',
      atendimento: 'bg-(--color-bg-overlay) text-(--color-text-secondary)',
      admin: 'bg-success-subtle text-success',
    }[level];
  }

  openCreateModal(): void {
    this.newMember.set({ role: 'atendimento' });
    this.showCreateModal.set(true);
  }

  saveIntegration(): void {
    const dto = this.integrationForm();
    if (!Object.keys(dto).length) return;

    this.settingsService.upsertIntegration(dto).subscribe({
      next: (updated) => {
        this.integration.set(updated);
        this.integrationForm.update((f) => ({ ...f, accessToken: undefined }));
        this.integrationSaved.set(true);
        this.notification.success('Integração salva com sucesso.');
        setTimeout(() => this.integrationSaved.set(false), 2000);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao salvar integração.'));
      },
    });
  }

  updateIntegrationToggle(
    key: keyof Pick<UpsertIntegrationDto, 'botEnabled' | 'autoReminder'>,
    value: boolean,
  ): void {
    this.integrationForm.update((f) => ({ ...f, [key]: value }));
  }

  onSaveMember(entity: Partial<NewMemberForm>): void {
    if (!entity.username?.trim() || !entity.password?.trim()) {
      this.notification.warning('Usuário e senha são obrigatórios.');
      return;
    }
    this.loading.set(true);
    this.settingsService
      .createMember({
        username: entity.username,
        password: entity.password,
        role: entity.role ?? 'atendimento',
        phone: entity.phone,
        ...(entity.role === 'medico' && {
          name: entity.name,
          specialty: entity.specialty,
        }),
      })
      .subscribe({
        next: (member) => {
          this.members.update((list) => [...list, member]);
          this.showCreateModal.set(false);
          this.loading.set(false);
          this.notification.success('Membro cadastrado com sucesso.');
        },
        error: (err: HttpErrorResponse) => {
          this.notification.error(this.getErrorMessage(err, 'Erro ao cadastrar membro.'));
          this.loading.set(false);
        },
      });
  }

  openEditModal(member: TeamMember): void {
    this.editMemberId.set(member.id);
    this.editMember.set({
      username: member.username,
      role: member.role,
      phone: member.phone ?? undefined,
      active: member.active ? 'Ativo' : 'Inativo',
    });
    this.showEditModal.set(true);
  }

  onUpdateMember(entity: Partial<NewMemberForm & { active: string }>): void {
    const id = this.editMemberId();
    if (!id) return;

    const dto: Record<string, unknown> = {};
    if (entity.username?.trim()) dto['username'] = entity.username.trim();
    if (entity.password?.trim()) dto['password'] = entity.password.trim();
    if (entity.role) dto['role'] = entity.role;
    if (entity.phone !== undefined) dto['phone'] = entity.phone;
    if (entity.active !== undefined) dto['active'] = entity.active;

    this.settingsService.updateMember(id, dto as any).subscribe({
      next: (updated) => {
        this.members.update((list) => list.map((m) => (m.id === id ? updated : m)));
        this.showEditModal.set(false);
        this.notification.success('Membro atualizado com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar membro.'));
      },
    });
  }

  async removeMember(id: number): Promise<void> {
    const confirmed = await alertConfirm('Deseja remover este membro?');
    if (!confirmed) return;

    this.settingsService.removeMember(id).subscribe({
      next: () => {
        this.members.update((list) => list.filter((m) => m.id !== id));
        this.notification.success('Membro removido com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao remover membro.'));
      },
    });
  }

  saveCompany(): void {
    const current = this.companyData();
    if (!current || !this.originalCompany) return;

    const dto = (Object.keys(current) as (keyof CompanyData)[]).reduce((acc, key) => {
      if (current[key] !== this.originalCompany![key]) acc[key] = current[key] as any;
      return acc;
    }, {} as Partial<CompanyData>);

    if (!Object.keys(dto).length) {
      this.notification.warning('Nenhuma alteração detectada.');
      return;
    }

    this.settingsService.updateCompany(dto).subscribe({
      next: (updated) => {
        this.companyData.set(updated);
        this.originalCompany = { ...updated };
        this.companySaved.set(true);
        this.notification.success('Dados da empresa salvos.');
        setTimeout(() => this.companySaved.set(false), 2000);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao salvar empresa.'));
      },
    });
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const nestMessage = err?.error?.message;
    if (nestMessage) {
      return Array.isArray(nestMessage) ? nestMessage.join('<br>') : nestMessage;
    }
    return defaultMsg;
  }
}
