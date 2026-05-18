import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceiroService } from '../services/financial.service';
import {
  CashClosingRow,
  Expense,
  FinanceSummary,
  PaymentMethod,
  ProfessionalRevenue,
  Transaction,
} from '../types/financial.types';

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [FinanceiroService],
  templateUrl: './financial.html',
})
export class Financial {
  private service = inject(FinanceiroService);

  summary!: FinanceSummary;
  expenses: Expense[] = [];
  transactions: Transaction[] = [];
  professionals: ProfessionalRevenue[] = [];
  cashClosing: CashClosingRow[] = [];

  dateFrom: string = '';
  dateTo: string = '';
  activeRange: 'hoje' | 'semana' | 'mes' = 'hoje';

  ngOnInit(): void {
    this.summary = this.service.getSummary();
    this.expenses = this.service.getExpenses();
    this.transactions = this.service.getTransactions();
    this.professionals = this.service.getProfessionalRevenues();
    this.cashClosing = this.service.getCashClosing();
    this.setRange('hoje');
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
  }

  onDateChange(): void {
    this.activeRange = 'hoje'; // nenhum preset ativo ao editar manualmente
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

  statusClass(status: 'pago' | 'pendente'): string {
    return status === 'pago'
      ? 'bg-(--color-success-subtle) text-(--color-success)'
      : 'bg-(--color-warning-subtle) text-(--color-warning)';
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  maxProfessionalValue(): number {
    return Math.max(...this.professionals.map((p) => p.value));
  }
}
