import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { PaymentEntry, PaymentResponseDto } from '../../features/calendar/types/calendar.types';
import { NotificationService } from '../toastr/notification.service';
import { CompanyData } from '../../features/settings/types/settings.types';
import { SettingsService } from '../../features/settings/services/settings.service';
import { PaymentMethod } from '../../features/financial/types/financial.types';
import { FiscalService } from '../../features/fiscal/services/fiscal.service';
import { PlatformService } from '../../core/services/platform.service';
import { CalendarService } from '../../features/calendar/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
};

@Component({
  selector: 'app-modal-appointment-receipt',
  imports: [FormsModule],
  templateUrl: './modal-appointment-receipt.html',
})
export class ModalAppointmentReceipt implements OnInit {
  @Input() paymentData!: PaymentResponseDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() paymentUpdated = new EventEmitter<void>();
  @Output() paymentReversed = new EventEmitter<void>();

  private companyService = inject(SettingsService);
  private fiscalService = inject(FiscalService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private platform = inject(PlatformService);
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  isAdmin = false;
  editMode = false;
  editEntries: PaymentEntry[] = [];
  editDiscount = 0;
  saving = false;
  reversing = false;

  companyData: CompanyData | null = null;

  invoiceIssued = false;
  invoiceXmlUrl: string | null = null;
  invoicePdfUrl: string | null = null;
  uploadingXml = false;
  uploadingPdf = false;

  ngOnInit(): void {
    this.invoiceIssued = this.paymentData.invoiceIssued;
    this.invoiceXmlUrl = this.paymentData.invoiceXmlUrl;
    this.invoicePdfUrl = this.paymentData.invoicePdfUrl;
    this.isAdmin = this.authService.getTokenPayload()?.role === 'admin';

    this.companyService.getCompany().subscribe({
      next: (company) => {
        this.companyData = company;
        this.cdr.detectChanges();
      },
      error: () => this.notification.error('Erro ao carregar dados da empresa'),
    });
  }

  startEdit(): void {
    this.editEntries = this.paymentData.entries.map((e) => ({ ...e }));
    this.editDiscount = this.paymentData.discount ?? 0;
    this.editMode = true;
  }

  cancelEdit(): void {
    this.editMode = false;
  }

  saveEdit(): void {
    if (this.saving) return;
    this.saving = true;
    this.calendarService
      .updatePayment(
        this.paymentData.appointmentId,
        this.paymentData.id,
        this.editEntries,
        this.editDiscount,
      )
      .subscribe({
        next: (updated) => {
          this.paymentData = { ...this.paymentData, ...updated };
          this.editMode = false;
          this.saving = false;
          this.notification.success('Pagamento atualizado com sucesso.');
          this.paymentUpdated.emit();
          this.cdr.detectChanges();
        },
        error: () => {
          this.notification.error('Erro ao atualizar pagamento.');
          this.saving = false;
          this.cdr.detectChanges();
        },
      });
  }

  addEntry(): void {
    this.editEntries.push({ method: 'pix', amount: 0, change: 0 } as PaymentEntry);
  }

  removeEntry(index: number): void {
    this.editEntries.splice(index, 1);
  }

  reversePayment(): void {
    if (this.reversing) return;
    if (
      !confirm(
        'Estornar este pagamento? O agendamento voltará para cancelado e esta ação não pode ser desfeita.',
      )
    )
      return;

    this.reversing = true;
    this.calendarService
      .reversePayment(this.paymentData.appointmentId, this.paymentData.id)
      .subscribe({
        next: () => {
          this.notification.success('Pagamento estornado com sucesso.');
          this.paymentReversed.emit();
          this.close();
        },
        error: () => {
          this.notification.error('Erro ao estornar pagamento.');
          this.reversing = false;
          this.cdr.detectChanges();
        },
      });
  }

  getFormattedDate(): string {
    const d = new Date(this.paymentData.date);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
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

  methodLabel(method: PaymentMethod): string {
    return METHOD_LABELS[method] ?? method;
  }

  close(): void {
    this.closeModal.emit();
  }

  onXmlSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadFile({ xml: file }, 'xml');
    (event.target as HTMLInputElement).value = '';
  }

  onPdfSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadFile({ pdf: file }, 'pdf');
    (event.target as HTMLInputElement).value = '';
  }

  private uploadFile(files: { xml?: File; pdf?: File }, kind: 'xml' | 'pdf'): void {
    if (kind === 'xml') this.uploadingXml = true;
    else this.uploadingPdf = true;

    this.fiscalService.uploadFiscalDocuments(this.paymentData.id, files).subscribe({
      next: (res) => {
        this.invoiceIssued = res.invoiceIssued;
        this.invoiceXmlUrl = res.invoiceXmlUrl;
        this.invoicePdfUrl = res.invoicePdfUrl;
        if (res.deductionExceeded) {
          this.notification.error(
            'O abatimento configurado excedeu a comissão do médico. Comissão zerada.',
          );
        } else {
          this.notification.success(
            kind === 'xml' ? 'XML enviado com sucesso.' : 'PDF enviado com sucesso.',
          );
        }
        if (kind === 'xml') this.uploadingXml = false;
        else this.uploadingPdf = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.error('Erro ao enviar arquivo da nota fiscal.');
        if (kind === 'xml') this.uploadingXml = false;
        else this.uploadingPdf = false;
        this.cdr.detectChanges();
      },
    });
  }

  async openFiscalEmission() {
    await this.platform.openExternal('https://espinosa.sintesenotafiscal.com.br/NFSEWeb/');
  }

  printA4(): void {
    const p = this.paymentData;
    const c = this.companyData;
    const logoUrl = `${window.location.origin}/logo-empresa.jpeg`;

    const addressLine = c
      ? `${c.street}, ${c.number}${c.complement ? ', ' + c.complement : ''} - ${c.neighborhood} - ${c.city}/${c.state} - CEP: ${c.cityCode}`
      : '';

    const descriptionText =
      p.appointmentTypeName && p.specialty
        ? `${p.appointmentTypeName} - ${p.specialty}`
        : p.appointmentTypeName
          ? p.appointmentTypeName
          : p.specialty
            ? `Consulta - ${p.specialty}`
            : 'Consulta médica';

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
          .fiscal-note {
            font-size: 8pt;
            color: #888;
            text-align: right;
            white-space: nowrap;
          }
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

        <h1>Recibo de Consulta</h1>

        <div class="meta-grid">
          <p><strong>Paciente:</strong> ${p.patient}</p>
          <p><strong>Data:</strong> ${this.getFormattedDate()}</p>
          <p><strong>Médico:</strong> ${p.doctor}</p>
          ${p.startTime ? `<p><strong>Horário:</strong> ${p.startTime}</p>` : ''}
          ${p.specialty ? `<p><strong>Especialidade:</strong> ${p.specialty}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr><th>Descrição</th><th class="text-right">Valor</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>${descriptionText}</td>
              <td class="text-right">R$ ${this.formatNumber(p.value + p.discount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          ${p.discount > 0 ? `<p><span>Desconto</span><span>R$ ${this.formatNumber(p.discount).toFixed(2)}</span></p>` : ''}
          <p class="total-final"><span>Total Pago</span><span>R$ ${this.formatNumber(p.value).toFixed(2)}</span></p>
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

  print(): void {
    const content = document.getElementById('receiptContent')?.innerHTML;
    if (!content) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styles = Array.from(document.styleSheets)
      .map((style) => {
        try {
          return style.href ? `<link rel="stylesheet" href="${style.href}">` : '';
        } catch {
          return '';
        }
      })
      .join('');

    doc.open();
    doc.write(`
      <html>
        <head>
          ${styles}
          <style>
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body {
                margin: 0;
                padding: 5mm;
                width: 80mm;
                font-family: 'Courier New', monospace;
                font-size: 10pt;
                font-weight: bold;
              }
              * { font-weight: bold !important; }
              button, .no-print { display: none !important; }
              table { width: 100%; border-collapse: collapse; font-size: 9pt; }
              th, td { padding: 2px; text-align: left; }
            }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 100);">
          ${content}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => document.body.removeChild(iframe), 2000);
  }
}
