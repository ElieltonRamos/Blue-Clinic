import { inject, Injectable } from '@angular/core';
import { environment } from '../../../core/services/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import User from '../types/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.apiUrl;
  private client = inject(HttpClient);

  createUser(user: User) {
    return this.client.post<User>(`${this.apiUrl}/users`, user);
  }

  getUsers(filters?: any) {
    let params = new HttpParams();

    if (filters) {
      if (filters.username) {
        params = params.set('username', filters.username);
      }
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.workplace) {
        params = params.set('workplace', filters.workplace);
      }
      if (filters.active !== '') {
        params = params.set('active', filters.active);
      }
    }

    return this.client.get<User[]>(`${this.apiUrl}/users`, { params });
  }

  editUser(id: number, user: User) {
    const { id: _, createdAt, updatedAt, deletedAt, ...userData } = user;
    return this.client.patch<User>(`${this.apiUrl}/users/${id}`, userData);
  }

  deleteUser(id: number) {
    return this.client.delete<User>(`${this.apiUrl}/users/${id}`);
  }
}
