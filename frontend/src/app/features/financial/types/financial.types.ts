export type TransactionType = 'entrada' | 'saida';
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao';
export type ExpenseStatus = 'pago' | 'pendente';

export interface CreateExpenseDto {
  description: string;
  category: string;
  value: number;
  date: string;
  status: ExpenseStatus;
}

export interface UpdateExpenseDto {
  description?: string;
  category?: string;
  value?: number;
  date?: string;
  status?: ExpenseStatus;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  registeredById: number;
  registeredByName: string;
  value: number;
  date: string;
  status: ExpenseStatus;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  time: string;
  patient: string;
  doctor: string;
  registeredBy: string;
  value: number;
  methods: PaymentMethod[];
}

export interface ProfessionalRevenueAppointment {
  date: string;
  startTime: string;
  specialty: string;
  appointmentType: string | null;
  patientName: string;
  paymentValue: number;
  doctorEarnings: number;
  discount: number;
  paymentDate: string;
}

export interface ProfessionalRevenue {
  id: string;
  name: string;
  avatar: string;
  value: number;
  appointments: ProfessionalRevenueAppointment[];
}

export interface CashClosingRow {
  operator: string;
  pix: number;
  dinheiro: number;
  cartao: number;
  convenio: number;
}

export interface FinanceSummary {
  totalEntradas: number;
  entradasChange: number;
  totalSaidas: number;
  saidasCount: number;
}
