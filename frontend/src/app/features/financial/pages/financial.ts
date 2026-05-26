import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { FinanceiroService, FinanceFilter } from '../services/financial.service';
import { NotificationService } from '../../../shared/toastr/notification.service';
import {
  CashClosingRow,
  Expense,
  FinanceSummary,
  PaymentMethod,
  ProfessionalRevenue,
  Transaction,
} from '../types/financial.types';
import { FormField, ModalEditEntity } from '../../../shared/modal-edit-entity/modal-edit-entity';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalEditEntity],
  providers: [FinanceiroService],
  templateUrl: './financial.html',
})
export class Financial implements OnInit {
  private service = inject(FinanceiroService);
  private notify = inject(NotificationService);

  summary: FinanceSummary = { totalEntradas: 0, entradasChange: 0, totalSaidas: 0, saidasCount: 0 };
  expenses: Expense[] = [];
  transactions: Transaction[] = [];
  professionals: ProfessionalRevenue[] = [];
  cashClosing: CashClosingRow[] = [];

  dateFrom = '';
  dateTo = '';
  activeRange: 'hoje' | 'semana' | 'mes' = 'hoje';
  pageLoading = signal(false);
  showExpenseModal = false;
  expenseEntity: any = {};
  showEditExpenseModal = false;
  editExpenseEntity: any = {};
  editingExpenseId: string | null = null;

  readonly expenseFields: FormField[] = [
    {
      name: 'description',
      label: 'Descrição',
      type: 'text',
      placeholder: 'Ex: Aluguel',
      required: true,
    },
    {
      name: 'category',
      label: 'Categoria',
      type: 'select',
      options: ['Infraestrutura', 'Insumos', 'Contas Fixas', 'Outros'],
      required: true,
    },
    { name: 'value', label: 'Valor (R$)', type: 'number', placeholder: '0.00', required: true },
    { name: 'date', label: 'Data', type: 'date', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: ['pago', 'pendente'],
      required: true,
    },
  ];

  ngOnInit(): void {
    this.setRange('hoje');
  }

  private get filter(): FinanceFilter {
    return { dateFrom: this.dateFrom, dateTo: this.dateTo };
  }

  private loadAll(): void {
    if (!this.dateFrom || !this.dateTo) return;
    this.pageLoading.set(true);

    forkJoin({
      summary: this.service.getSummary(this.filter),
      expenses: this.service.getExpenses(this.filter),
      transactions: this.service.getTransactions(this.filter),
      professionals: this.service.getProfessionalRevenues(this.filter),
      cashClosing: this.service.getCashClosing(this.filter),
    }).subscribe({
      next: (data) => {
        this.summary = data.summary;
        this.expenses = data.expenses;
        this.transactions = data.transactions;
        this.professionals = data.professionals;
        this.cashClosing = data.cashClosing;
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.log('erro', err);
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar dados financeiros'));
        this.pageLoading.set(false);
      },
    });
  }

  setRange(range: 'hoje' | 'semana' | 'mes'): void {
    this.activeRange = range;
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (range === 'hoje') {
      this.dateFrom = fmt(today);
      this.dateTo = fmt(today);
    } else if (range === 'semana') {
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      this.dateFrom = fmt(monday);
      this.dateTo = fmt(sunday);
    } else {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      this.dateFrom = fmt(first);
      this.dateTo = fmt(last);
    }

    this.loadAll();
  }

  onDateChange(): void {
    this.activeRange = 'hoje';
    this.loadAll();
  }

  get cashClosingTotals(): CashClosingRow {
    return this.cashClosing.reduce(
      (acc, row) => ({
        operator: 'TOTAL',
        pix: acc.pix + row.pix,
        dinheiro: acc.dinheiro + row.dinheiro,
        cartao: acc.cartao + row.cartao,
        convenio: acc.convenio + row.convenio,
      }),
      { operator: '', pix: 0, dinheiro: 0, cartao: 0, convenio: 0 },
    );
  }

  get cashClosingGrandTotal(): number {
    const t = this.cashClosingTotals;
    return t.pix + t.dinheiro + t.cartao + t.convenio;
  }

  rowTotal(row: CashClosingRow): number {
    return row.pix + row.dinheiro + row.cartao + row.convenio;
  }

  methodLabel(method: PaymentMethod): string {
    return { pix: 'PIX', dinheiro: 'DINHEIRO', cartao: 'CARTÃO', convenio: 'CONVÊNIO' }[method];
  }

  methodClass(method: PaymentMethod): string {
    return {
      pix: 'bg-(--color-primary-subtle) text-(--color-primary-text)',
      dinheiro: 'bg-(--color-bg-overlay) text-(--color-text-secondary)',
      cartao: 'bg-(--color-info-subtle) text-(--color-info)',
      convenio: 'bg-(--color-warning-subtle) text-(--color-warning)',
    }[method];
  }

  openExpenseModal(): void {
    this.expenseEntity = { status: 'pendente', date: this.dateFrom };
    this.showExpenseModal = true;
  }

  saveExpense(entity: any): void {
    this.service.createExpense(entity).subscribe({
      next: () => {
        this.notify.success('Despesa cadastrada com sucesso');
        this.showExpenseModal = false;
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao cadastrar despesa'));
      },
    });
  }

  openEditExpenseModal(expense: Expense): void {
    this.editingExpenseId = expense.id;
    this.editExpenseEntity = {
      description: expense.description,
      category: expense.category,
      value: expense.value,
      date: expense.date,
      status: expense.status,
    };
    this.showEditExpenseModal = true;
  }

  saveEditExpense(entity: any): void {
    if (!this.editingExpenseId) return;
    this.service.updateExpense(this.editingExpenseId, entity).subscribe({
      next: () => {
        this.notify.success('Despesa atualizada com sucesso');
        this.showEditExpenseModal = false;
        this.editingExpenseId = null;
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao atualizar despesa'));
      },
    });
  }

  markAsPaid(expense: Expense): void {
    this.service.markExpenseAsPaid(expense.id).subscribe({
      next: () => {
        this.notify.success('Despesa marcada como paga');
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao atualizar status'));
      },
    });
  }

  statusClass(status: 'pago' | 'pendente'): string {
    return status === 'pago'
      ? 'bg-(--color-success-subtle) text-(--color-success)'
      : 'bg-(--color-warning-subtle) text-(--color-warning)';
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  maxProfessionalValue(): number {
    return Math.max(...this.professionals.map((p) => p.value), 1);
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const msg = err?.error?.message;
    return msg ? (Array.isArray(msg) ? msg.join(', ') : msg) : defaultMsg;
  }
}
