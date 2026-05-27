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
import { SettingsService } from '../../settings/services/settings.service';
import { CompanyData } from '../../settings/types/settings.types';

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
  private settingsService = inject(SettingsService);
  companyData: CompanyData | null = null;

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
    this.settingsService.getCompany().subscribe({
      next: (company) => (this.companyData = company),
      error: () => this.notify.error('Erro ao carregar dados da empresa'),
    });
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
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

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

  private getTodayFormatted(): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(),
    );
  }

  private getFullDate(): string {
    if (!this.dateFrom || !this.dateTo) return '';
    const [y1, m1, d1] = this.dateFrom.split('-').map(Number);
    const [y2, m2, d2] = this.dateTo.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);
    const fmt = new Intl.DateTimeFormat('pt-BR');
    return `${fmt.format(start)} - ${fmt.format(end)}`;
  }

  private printViaIframe(html: string): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.addEventListener('load', () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    });
  }

  private get baseStyles(): string {
    return `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 12mm 14mm; }
    body { font-family: 'IBM Plex Sans', sans-serif; font-size: 9pt; color: #1a1a2e; background: white; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1a1a2e; padding-bottom: 10px; margin-bottom: 14px; }
    .company-name { font-size: 15pt; font-weight: 700; }
    .company-sub { font-size: 8pt; color: #555; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 8pt; color: #444; line-height: 1.6; }
    .report-meta strong { font-size: 10pt; display: block; margin-bottom: 2px; }
    .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; border-left: 3px solid #1a1a2e; padding-left: 8px; margin: 14px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px; }
    thead tr { background: #1a1a2e; color: white; }
    thead th { padding: 5px 8px; text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3px; }
    tbody tr:nth-child(even) { background: #f2f2f8; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e0e0ec; }
    td.amount { text-align: right; font-weight: 600; }
    tfoot td { padding: 5px 8px; font-weight: 700; border-top: 2px solid #1a1a2e; }
    tfoot td.total { text-align: right; color: #1a6b3c; }
    .print-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 7pt; color: #888; }
  `;
  }

  private get printHeader(): string {
    const logoUrl = `${window.location.origin}/logo-principal.png`;
    return `
    <div class="print-header">
      <div style="display:flex;align-items:center;gap:10px">
         <img src="${logoUrl}" alt="Logo" style="height:36px" />
        <div>
          <div class="company-name">${this.companyData?.tradeName || this.companyData?.corporateName || ''}</div>
          <div class="company-sub">CNPJ: ${this.companyData?.cnpj || ''} &nbsp;|&nbsp; ${this.companyData?.city || ''}/${this.companyData?.state || ''}</div>
        </div>
      </div>
      <div class="report-meta">
        <strong>BlueClinic</strong>
        Período: ${this.getFullDate()}<br/>
        Emitido em: ${this.getTodayFormatted()}
      </div>
    </div>
  `;
  }

  exportProfessionalRevenues(): void {
    const rows = this.professionals
      .map(
        (p) => `
    <tr>
      <td>${p.name}</td>
      <td class="amount">${this.formatCurrency(p.value)}</td>
      <td class="amount">${this.professionals.length > 0 ? ((p.value / this.professionals.reduce((s, x) => s + x.value, 0)) * 100).toFixed(1) + '%' : '—'}</td>
    </tr>
  `,
      )
      .join('');

    const total = this.professionals.reduce((s, p) => s + p.value, 0);

    this.printViaIframe(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    ${this.baseStyles}
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
    .card { border: 1px solid #d0d0e8; border-radius: 4px; padding: 8px 12px; }
    .card-label { font-size: 7pt; color: #888; text-transform: uppercase; margin-bottom: 2px; }
    .card-value { font-size: 11pt; font-weight: 700; color: #1a1a2e; }
  </style></head><body>
    ${this.printHeader}
    <div class="section-title">Produtividade por Profissional</div>
    <div class="summary-cards">
      <div class="card">
        <div class="card-label">Total de Profissionais</div>
        <div class="card-value">${this.professionals.length}</div>
      </div>
      <div class="card">
        <div class="card-label">Receita Total</div>
        <div class="card-value">${this.formatCurrency(total)}</div>
      </div>
      <div class="card">
        <div class="card-label">Média por Profissional</div>
        <div class="card-value">${this.professionals.length > 0 ? this.formatCurrency(total / this.professionals.length) : '—'}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Profissional</th><th>Receita</th><th>Participação</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td><strong>Total</strong></td><td class="total">${this.formatCurrency(total)}</td><td class="total">100%</td></tr></tfoot>
    </table>
    <div class="print-footer">
      <span>${this.companyData?.tradeName || ''} — BlueClinic</span>
      <span>Gerado em ${this.getTodayFormatted()}</span>
    </div>
  </body></html>`);
  }

  exportCashClosing(): void {
    const rows = this.cashClosing
      .map(
        (row) => `
    <tr>
      <td>${row.operator}</td>
      <td class="amount">${this.formatCurrency(row.pix)}</td>
      <td class="amount">${this.formatCurrency(row.dinheiro)}</td>
      <td class="amount">${this.formatCurrency(row.cartao)}</td>
      <td class="amount">${this.formatCurrency(row.convenio)}</td>
      <td class="amount">${this.formatCurrency(this.rowTotal(row))}</td>
    </tr>
  `,
      )
      .join('');

    const t = this.cashClosingTotals;

    this
      .printViaIframe(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${this.baseStyles}</style></head><body>
    ${this.printHeader}
    <div class="section-title">Fechamento de Caixa por Operador</div>
    <table>
      <thead><tr><th>Operador</th><th>PIX</th><th>Dinheiro</th><th>Cartão</th><th>Convênio</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td class="amount">${this.formatCurrency(t.pix)}</td>
          <td class="amount">${this.formatCurrency(t.dinheiro)}</td>
          <td class="amount">${this.formatCurrency(t.cartao)}</td>
          <td class="amount">${this.formatCurrency(t.convenio)}</td>
          <td class="total">${this.formatCurrency(this.cashClosingGrandTotal)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="print-footer">
      <span>${this.companyData?.tradeName || ''} — BlueClinic</span>
      <span>Gerado em ${this.getTodayFormatted()}</span>
    </div>
  </body></html>`);
  }

  exportTransactions(): void {
    const rows = this.transactions
      .map(
        (tx) => `
    <tr>
      <td>${tx.date} ${tx.time}</td>
      <td style="color:${tx.type === 'entrada' ? '#1a6b3c' : '#c0392b'};font-weight:600">${tx.type === 'entrada' ? '↗ Entrada' : '↘ Saída'}</td>
      <td>${tx.patient}</td>
      <td>${tx.doctor || '—'}</td>
      <td>${tx.registeredBy}</td>
      <td>${tx.methods.join(', ').toUpperCase() || '—'}</td>
      <td class="amount" style="color:${tx.type === 'entrada' ? '#1a6b3c' : '#c0392b'}">${tx.type === 'entrada' ? '+' : '-'} ${this.formatCurrency(tx.value)}</td>
    </tr>
  `,
      )
      .join('');

    const totalEntradas = this.transactions
      .filter((t) => t.type === 'entrada')
      .reduce((s, t) => s + t.value, 0);
    const totalSaidas = this.transactions
      .filter((t) => t.type === 'saida')
      .reduce((s, t) => s + t.value, 0);

    this.printViaIframe(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    ${this.baseStyles}
    .summary { display:flex; gap:12px; margin-bottom:14px; }
    .summary-item { flex:1; border:1px solid #d0d0e8; border-radius:4px; padding:8px 12px; }
    .summary-label { font-size:7pt; color:#888; text-transform:uppercase; margin-bottom:2px; }
    .summary-value { font-size:11pt; font-weight:700; }
    .green { color:#1a6b3c; } .red { color:#c0392b; }
  </style></head><body>
    ${this.printHeader}
    <div class="section-title">Extrato de Transações</div>
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Total de Transações</div>
        <div class="summary-value">${this.transactions.length}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Entradas</div>
        <div class="summary-value green">${this.formatCurrency(totalEntradas)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Saídas</div>
        <div class="summary-value red">${this.formatCurrency(totalSaidas)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Saldo</div>
        <div class="summary-value ${totalEntradas - totalSaidas >= 0 ? 'green' : 'red'}">${this.formatCurrency(totalEntradas - totalSaidas)}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Descrição</th><th>Profissional</th><th>Operador</th><th>Método</th><th>Valor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="print-footer">
      <span>${this.companyData?.tradeName || ''} — BlueClinic</span>
      <span>Gerado em ${this.getTodayFormatted()}</span>
    </div>
  </body></html>`);
  }
}
