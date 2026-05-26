import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { PaymentResponseDto } from '../../features/calendar/types/calendar.types';
import { NotificationService } from '../toastr/notification.service';
import { CompanyData } from '../../features/settings/types/settings.types';
import { SettingsService } from '../../features/settings/services/settings.service';
import { PaymentMethod } from '../../features/financial/types/financial.types';

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  convenio: 'Convênio',
};

@Component({
  selector: 'app-modal-appointment-receipt',
  imports: [],
  templateUrl: './modal-appointment-receipt.html',
})
export class ModalAppointmentReceipt implements OnInit {
  @Input() paymentData!: PaymentResponseDto;
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

  getFormattedDate(): string {
    return new Date(this.paymentData.date).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
