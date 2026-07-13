import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import { FiscalDocumentResponseDto } from '../types/fiscal.types';

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
}
