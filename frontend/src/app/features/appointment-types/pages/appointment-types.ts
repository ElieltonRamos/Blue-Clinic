import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { AppointmentTypeService } from '../services/appointment-type.service';
import { AppointmentType } from '../types/appointment-type.types';

interface TypeRow {
  type: AppointmentType;
  editing: boolean;
  saving: boolean;
  form: { name: string; duration: number };
}

interface TypeForm {
  name: string;
  duration: number | null;
}

@Component({
  selector: 'app-appointment-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-types.html',
})
export class AppointmentTypes implements OnInit {
  private readonly service = inject(AppointmentTypeService);
  private readonly notification = inject(NotificationService);

  loading = signal(false);

  rows: TypeRow[] = [];
  showNewForm = false;
  savingNew = false;
  newForm: TypeForm = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (types) => {
        this.rows = types.map((t) => this.toRow(t));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Erro ao carregar tipos de consulta');
      },
    });
  }

  private toRow(type: AppointmentType): TypeRow {
    return {
      type,
      editing: false,
      saving: false,
      form: { name: type.name, duration: type.duration },
    };
  }

  private emptyForm(): TypeForm {
    return { name: '', duration: null };
  }

  cancelNew(): void {
    this.showNewForm = false;
    this.newForm = this.emptyForm();
  }

  saveNew(): void {
    if (!this.validateForm(this.newForm)) return;
    this.savingNew = true;
    this.service
      .create({ name: this.newForm.name.trim(), duration: this.newForm.duration! })
      .subscribe({
        next: (created) => {
          this.rows.push(this.toRow(created));
          this.newForm = this.emptyForm();
          this.showNewForm = false;
          this.savingNew = false;
          this.notification.success('Tipo de consulta criado');
        },
        error: () => {
          this.savingNew = false;
          this.notification.error('Erro ao criar tipo de consulta');
        },
      });
  }

  startEdit(row: TypeRow): void {
    row.form = { name: row.type.name, duration: row.type.duration };
    row.editing = true;
  }

  cancelEdit(row: TypeRow): void {
    row.editing = false;
  }

  saveEdit(row: TypeRow): void {
    if (!this.validateForm(row.form)) return;
    row.saving = true;
    this.service
      .update(row.type.id, { name: row.form.name.trim(), duration: row.form.duration })
      .subscribe({
        next: (updated) => {
          row.type = updated;
          row.editing = false;
          row.saving = false;
          this.notification.success('Tipo atualizado');
        },
        error: () => {
          row.saving = false;
          this.notification.error('Erro ao atualizar tipo');
        },
      });
  }

  remove(row: TypeRow): void {
    row.saving = true;
    this.service.remove(row.type.id).subscribe({
      next: () => {
        this.rows = this.rows.filter((r) => r !== row);
        this.notification.success('Tipo removido');
      },
      error: () => {
        row.saving = false;
        this.notification.error('Erro ao remover tipo');
      },
    });
  }

  private validateForm(form: TypeForm): boolean {
    if (!form.name?.trim()) {
      this.notification.error('Informe o nome');
      return false;
    }
    if (!form.duration || form.duration < 5) {
      this.notification.error('Duração mínima de 5 minutos');
      return false;
    }
    return true;
  }
}
