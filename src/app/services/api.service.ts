import { inject, Injectable } from '@angular/core';
import axios, { AxiosRequestConfig } from 'axios';
import { environment } from '../../environments/environment';
import { LoginResult, OrdersPage, Quote, Session, User } from './api.models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly session = inject(SessionService);
  private readonly client = axios.create({ baseURL: environment.apiUrl });

  constructor() {
    this.client.interceptors.response.use(
      response => response,
      (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401 && this.session.token !== null
          && error.config?.headers.get('Authorization') === 'Bearer ' + this.session.token) {
          this.session.clear();
        }
        return Promise.reject(error);
      },
    );
  }

  login(login: string, password: string) {
    return this.client.post<LoginResult>('/auth/login', { login: login.trim(), password });
  }

  verifyTwoFactor(ticket: string, code: string) {
    return this.client.post<Session>('/auth/login/verify-2fa', { ticket, code });
  }

  getUser() {
    return this.client.get<User>('/user', this.auth());
  }

  logout() {
    return this.client.post('/auth/logout', {}, this.auth());
  }

  getWaiterOrders(page: number) {
    return this.client.get<OrdersPage>('/waiter/orders', { ...this.auth(), params: { page } });
  }

  getCheckoutPreview(orderId: number) {
    return this.client.post<{ data: Quote }>(
      '/waiter/orders/' + orderId + '/checkout-preview', { payments: [] }, this.auth(),
    );
  }

  private auth(): AxiosRequestConfig {
    return { headers: { Authorization: 'Bearer ' + this.session.token } };
  }
}
