export interface FiscalDocumentResponseDto {
  id: number;
  invoiceIssued: boolean;
  invoiceXmlUrl: string | null;
  invoicePdfUrl: string | null;
  doctorEarnings: number;
  deductionExceeded: boolean;
}

export interface FiscalSummary {
  issuedCount: number;
  pendingCount: number;
  totalDeducted: number;
}

export interface FiscalDocumentItem {
  paymentId: number;
  patientName: string;
  doctorName: string;
  value: number;
  doctorEarnings: number;
  date: string;
  invoiceXmlUrl: string | null;
  invoicePdfUrl: string | null;
}

export interface FiscalPendingItem {
  paymentId: number;
  appointmentId: number;
  patientName: string;
  doctorName: string;
  value: number;
  date: string;
}

export interface FiscalFilter {
  dateFrom: string;
  dateTo: string;
  doctorId?: number;
}
