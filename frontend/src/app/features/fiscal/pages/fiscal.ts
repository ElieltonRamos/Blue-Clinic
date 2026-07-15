import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { FiscalService } from '../services/fiscal.service';
import { NotificationService } from '../../../shared/toastr/notification.service';
import {
  FiscalDocumentItem,
  FiscalFilter,
  FiscalPendingItem,
  FiscalSummary,
} from '../types/fiscal.types';
import { environment } from '../../../core/services/environment';
import { ModalAppointmentReceipt } from '../../../shared/modal-appointment-receipt/modal-appointment-receipt';
import { CalendarService } from '../../calendar/services/calendar.service';
import { PaymentResponseDto } from '../../calendar/types/calendar.types';
import { alertConfirm } from '../../../shared/alerts/custom-alerts';
import { PlatformService } from '../../../core/services/platform.service';

@Component({
  selector: 'app-fiscal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalAppointmentReceipt],
  templateUrl: './fiscal.html',
})
export class Fiscal implements OnInit {
  private service = inject(FiscalService);
  private notify = inject(NotificationService);
  private calendarService = inject(CalendarService);
  private platform = inject(PlatformService);

  summary: FiscalSummary = { issuedCount: 0, pendingCount: 0, totalDeducted: 0 };
  documents: FiscalDocumentItem[] = [];
  pending: FiscalPendingItem[] = [];
  selectedPayment: PaymentResponseDto | null = null;
  loadingEmission = signal(false);

  activeTab: 'emitidas' | 'pendentes' = 'emitidas';
  dateFrom = '';
  dateTo = '';
  activeRange: 'hoje' | 'semana' | 'mes' = 'mes';
  pageLoading = signal(false);

  ngOnInit(): void {
    this.setRange('mes');
  }

  private get filter(): FiscalFilter {
    return { dateFrom: this.dateFrom, dateTo: this.dateTo };
  }

  openEmission(item: FiscalPendingItem): void {
    if (this.loadingEmission()) return;
    this.loadingEmission.set(true);

    this.calendarService.getPaymentByAppointment(item.appointmentId).subscribe({
      next: (payment) => {
        this.selectedPayment = payment;
        this.loadingEmission.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar dados do pagamento'));
        this.loadingEmission.set(false);
      },
    });
  }

  closeEmissionModal(): void {
    this.selectedPayment = null;
    this.loadAll();
  }

  private loadAll(): void {
    if (!this.dateFrom || !this.dateTo) return;
    this.pageLoading.set(true);

    forkJoin({
      summary: this.service.getSummary(this.filter),
      documents: this.service.getDocuments(this.filter),
      pending: this.service.getPending(this.filter),
    }).subscribe({
      next: (data) => {
        this.summary = data.summary;
        this.documents = data.documents;
        this.pending = data.pending;
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar dados fiscais'));
        this.pageLoading.set(false);
      },
    });
  }

  setRange(range: 'hoje' | 'semana' | 'mes'): void {
    this.activeRange = range;
    const today = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

  async removeInvoice(doc: FiscalDocumentItem): Promise<void> {
    const confirmed = await alertConfirm(`Remover nota fiscal de ${doc.patientName}?`);
    if (!confirmed) return;

    this.service.removeInvoice(doc.paymentId).subscribe({
      next: () => {
        this.notify.success('Nota fiscal removida');
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao remover nota fiscal'));
      },
    });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const msg = err?.error?.message;
    return msg ? (Array.isArray(msg) ? msg.join(', ') : msg) : defaultMsg;
  }

  fullFileUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }

  viewDocument(doc: FiscalDocumentItem, type: 'xml' | 'pdf'): void {
    const request =
      type === 'xml'
        ? this.service.downloadXml(doc.paymentId)
        : this.service.downloadPdf(doc.paymentId);

    request.subscribe({
      next: async (blob: Blob) => {
        try {
          const mime = type === 'xml' ? 'application/xml' : 'application/pdf';
          const fileName = `nf_${doc.paymentId}.${type}`;
          await this.platform.openBlob(blob, fileName, mime);
        } catch (e) {
          console.error('Erro ao abrir documento:', e);
          this.notify.error(`Erro ao abrir ${type.toUpperCase()}`);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, `Erro ao abrir ${type.toUpperCase()}`));
      },
    });
  }
}
