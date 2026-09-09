import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ChangeDetectorRef,
} from '@angular/core';
import { PatientPaymentBatchResponse } from '../../features/patients/types/patients.types';
import { PaymentMethod } from '../../features/financial/types/financial.types';
import { CompanyData } from '../../features/settings/types/settings.types';
import { SettingsService } from '../../features/settings/services/settings.service';
import { NotificationService } from '../toastr/notification.service';

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
};

@Component({
  selector: 'app-modal-patient-receipt-batch',
  imports: [],
  templateUrl: './modal-patient-receipt-batch.html',
})
export class ModalPatientReceiptBatch implements OnInit {
  @Input() paymentData!: PatientPaymentBatchResponse;
  @Output() closeModal = new EventEmitter<void>();

  private companyService = inject(SettingsService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  companyData: CompanyData | null = null;

  ngOnInit(): void {
    this.companyService.getCompany().subscribe({
      next: (company) => {
        this.companyData = company;
        this.cdr.detectChanges();
      },
      error: () => this.notification.error('Erro ao carregar dados da empresa'),
    });
  }

  close(): void {
    this.closeModal.emit();
  }

  formatNumber(n: any): number {
    const num = Number(n);
    return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
  }

  formatCnpj(cnpj: string): string {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  formatPhone(phone: string): string {
    if (!phone) return '';
    return phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  methodLabel(method: PaymentMethod): string {
    return METHOD_LABELS[method] ?? method;
  }

  descriptionFor(item: PatientPaymentBatchResponse['items'][number]): string {
    if (item.appointmentTypeName && item.specialty) {
      return `${item.appointmentTypeName} - ${item.specialty}`;
    }
    if (item.appointmentTypeName) return item.appointmentTypeName;
    if (item.specialty) return `Consulta - ${item.specialty}`;
    return 'Consulta médica';
  }

  printA4(): void {
    const p = this.paymentData;
    const c = this.companyData;
    const logoUrl = `${window.location.origin}/logo-empresa.jpeg`;

    const addressLine = c
      ? `${c.street}, ${c.number}${c.complement ? ', ' + c.complement : ''} - ${c.neighborhood} - ${c.city}/${c.state} - CEP: ${c.cityCode}`
      : '';

    const itemsHtml = p.items
      .map(
        (item) =>
          `<tr>
          <td>${this.descriptionFor(item)}<br><span style="font-size:8pt;color:#666">${item.doctor} · ${this.formatDate(item.date)}</span></td>
          <td class="text-right">R$ ${this.formatNumber(item.value + item.discount).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    const entriesHtml = p.entries
      .map(
        (e) =>
          `<tr>
          <td>${this.methodLabel(e.method)}</td>
          <td class="text-right">R$ ${this.formatNumber(e.amount).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.title = ' ';
    doc.write(`
    <html>
      <head>
        <style>
          @page { size: A4; margin: 18mm 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            color: #1a1a1a;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #1a1a1a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .header-left { display: flex; align-items: center; gap: 14px; }
          .header-left img { max-height: 64px; max-width: 140px; object-fit: contain; }
          .company-name { font-size: 15pt; font-weight: bold; margin: 0; }
          .company-info { font-size: 9pt; color: #444; margin: 2px 0 0; line-height: 1.4; }
          .fiscal-note { font-size: 8pt; color: #888; text-align: right; white-space: nowrap; }
          h1 {
            font-size: 14pt;
            margin: 0 0 14px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 24px;
            font-size: 10pt;
            margin-bottom: 18px;
          }
          .meta-grid p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          th {
            background: #f2f2f2;
            padding: 8px 10px;
            text-align: left;
            font-size: 10pt;
            border-bottom: 2px solid #1a1a1a;
          }
          td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
          .text-right { text-align: right; }
          .totals { width: 260px; margin-left: auto; margin-top: 10px; }
          .totals p { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
          .totals .total-final {
            font-size: 13pt;
            font-weight: bold;
            border-top: 2px solid #1a1a1a;
            padding-top: 6px;
            margin-top: 6px;
          }
          .payment-section { margin-top: 22px; }
          .payment-section h2 {
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .footer {
            margin-top: 48px;
            padding-top: 12px;
            border-top: 1px solid #ccc;
            font-size: 8pt;
            color: #999;
            text-align: center;
          }
        </style>
      </head>
      <body onload="window.print(); setTimeout(() => window.close(), 100);">
        <div class="header">
          <div class="header-left">
            <img src="${logoUrl}" onerror="this.style.display='none'" />
            <div>
              <p class="company-name">${c?.tradeName ?? ''}</p>
              <p class="company-info">
                ${c ? this.formatCnpj(c.cnpj) : ''}${c?.phone ? ' · ' + this.formatPhone(c.phone) : ''}<br>
                ${addressLine}
              </p>
            </div>
          </div>
          <div class="fiscal-note">Documento sem<br>valor fiscal</div>
        </div>

        <h1>Recibo de Consultas</h1>

        <div class="meta-grid">
          <p><strong>Paciente:</strong> ${p.patient}</p>
          <p><strong>Emitido em:</strong> ${this.formatDate(new Date().toISOString())}</p>
        </div>

        <table>
          <thead>
            <tr><th>Descrição</th><th class="text-right">Valor</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="totals">
          ${p.totalDiscount > 0 ? `<p><span>Desconto</span><span>R$ ${this.formatNumber(p.totalDiscount).toFixed(2)}</span></p>` : ''}
          <p class="total-final"><span>Total Pago</span><span>R$ ${this.formatNumber(p.totalValue).toFixed(2)}</span></p>
        </div>

        <div class="payment-section">
          <h2>Forma de Pagamento</h2>
          <table>
            <tbody>${entriesHtml}</tbody>
          </table>
        </div>

        <div class="footer">
          ${c?.tradeName ?? ''}${c?.email ? ' &nbsp;|&nbsp; ' + c.email : ''}
        </div>
      </body>
    </html>
  `);
    doc.close();

    setTimeout(() => document.body.removeChild(iframe), 2000);
  }
}
