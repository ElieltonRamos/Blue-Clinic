import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  FiscalDocumentItem,
  FiscalDocumentResponseDto,
  FiscalFilter,
  FiscalPendingItem,
  FiscalSummary,
} from '../types/fiscal.types';

@Injectable({ providedIn: 'root' })
export class FiscalService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  uploadFiscalDocuments(paymentId: number, files: { xml?: File; pdf?: File }) {
    const form = new FormData();
    if (files.xml) form.append('xml', files.xml);
    if (files.pdf) form.append('pdf', files.pdf);

    return this.http.post<FiscalDocumentResponseDto>(
      `${this.apiUrl}/payments/${paymentId}/fiscal-documents`,
      form,
    );
  }

  removeFiscalDocuments(paymentId: number) {
    return this.http.delete<FiscalDocumentResponseDto>(
      `${this.apiUrl}/payments/${paymentId}/fiscal-documents`,
    );
  }

  getSummary(filter: FiscalFilter) {
    return this.http.get<FiscalSummary>(`${this.apiUrl}/fiscal/summary`, { params: { ...filter } });
  }

  getDocuments(filter: FiscalFilter) {
    return this.http.get<FiscalDocumentItem[]>(`${this.apiUrl}/fiscal/documents`, {
      params: { ...filter },
    });
  }

  getPending(filter: FiscalFilter) {
    return this.http.get<FiscalPendingItem[]>(`${this.apiUrl}/fiscal/pending`, {
      params: { ...filter },
    });
  }

  removeInvoice(paymentId: number) {
    return this.http.delete(`${this.apiUrl}/payments/${paymentId}/fiscal-documents`);
  }

  downloadXml(paymentId: number) {
    return this.http.get(`${this.apiUrl}/payments/${paymentId}/fiscal-documents/xml`, {
      responseType: 'blob',
    });
  }

  downloadPdf(paymentId: number) {
    return this.http.get(`${this.apiUrl}/payments/${paymentId}/fiscal-documents/pdf`, {
      responseType: 'blob',
    });
  }
}
