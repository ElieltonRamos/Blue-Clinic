export interface FiscalDocumentResponseDto {
  id: number;
  invoiceIssued: boolean;
  invoiceXmlUrl: string | null;
  invoicePdfUrl: string | null;
  doctorEarnings: number;
  deductionExceeded: boolean;
}
