export type TransactionType = 'entrada' | 'saida';
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'convenio';
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
  registeredById: number; // era: receptionist: string
  registeredByName: string; // era: receptionist: string
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
  methods: PaymentMethod[]; // era: method: PaymentMethod
}

export interface ProfessionalRevenue {
  id: string;
  name: string;
  avatar: string;
  value: number;
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
