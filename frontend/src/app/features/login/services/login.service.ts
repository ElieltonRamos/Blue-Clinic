import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import { Token } from '../types/auth';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServiceLogin {
  private apiUrl = environment.apiUrl;
  private client = inject(HttpClient);

  login(username: string, password: string) {
    return this.client.post<Token>(`${this.apiUrl}/users/login`, {
      username,
      password,
    });
  }
}
