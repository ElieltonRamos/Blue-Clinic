import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CashClosingRow,
  Expense,
  FinanceSummary,
  ProfessionalRevenue,
  Transaction,
} from '../types/financial.types';

export interface FinanceFilter {
  dateFrom: string;
  dateTo: string;
}

@Injectable()
export class FinanceiroService {
  private http = inject(HttpClient);
  private base = '/api/finance';

  private params(filter: FinanceFilter): HttpParams {
    return new HttpParams().set('dateFrom', filter.dateFrom).set('dateTo', filter.dateTo);
  }

  getSummary(filter: FinanceFilter): Observable<FinanceSummary> {
    return this.http.get<FinanceSummary>(`${this.base}/summary`, {
      params: this.params(filter),
    });
  }

  getExpenses(filter: FinanceFilter): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.base}/expenses`, {
      params: this.params(filter),
    });
  }

  getTransactions(filter: FinanceFilter): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.base}/transactions`, {
      params: this.params(filter),
    });
  }

  getProfessionalRevenues(filter: FinanceFilter): Observable<ProfessionalRevenue[]> {
    return this.http.get<ProfessionalRevenue[]>(`${this.base}/professional-revenues`, {
      params: this.params(filter),
    });
  }

  getCashClosing(filter: FinanceFilter): Observable<CashClosingRow[]> {
    return this.http.get<CashClosingRow[]>(`${this.base}/cash-closing`, {
      params: this.params(filter),
    });
  }
}
