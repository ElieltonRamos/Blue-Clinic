import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingsService } from '../services/settings.service';
import { version } from '../../../../../package.json';
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

  integrationToggles: {
    key: keyof Pick<UpsertIntegrationDto, 'botEnabled' | 'autoReminder'>;
    label: string;
  }[] = [
    { key: 'botEnabled', label: 'Bot ativo' },
    { key: 'autoReminder', label: 'Lembrete automático' },
  ];
  private originalCompany: CompanyData | null = null;

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
      name: 'role',
      label: 'Nível de Acesso',
      type: 'select',
      options: ['medico', 'atendimento', 'admin'],
    },
    { name: 'active', label: 'Status', type: 'select', options: ['Ativo', 'Inativo'] },
  ];

  ngOnInit(): void {
    this.loadMembers();
    this.loadCompany();
    this.loadIntegration();
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
            phoneNumberId: integration.phoneNumberId ?? undefined,
            botEnabled: integration.botEnabled,
            autoReminder: integration.autoReminder,
          });
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
