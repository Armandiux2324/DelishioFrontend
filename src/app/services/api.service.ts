import { RestaurantSettings, RestaurantSettingsValues } from './restaurant-settings.models';
import { inject, Injectable } from '@angular/core';
import axios, { AxiosRequestConfig } from 'axios';
import { environment } from '../../environments/environment';
import { ApiMessage, LoginResult, OrdersPage, ProfilePayload, Quote, RegisterPayload, ResetPasswordPayload, Session, User } from './api.models';
import { CreateRestaurantPayload, Restaurant, RestaurantPage, UpdateRestaurantPayload } from './restaurant.models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly session = inject(SessionService);
  private readonly client = axios.create({ baseURL: environment.apiUrl, headers: { Accept: 'application/json' } });

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

  login(login: string, password: string, locale: 'en' | 'es' = 'es') {
    return this.client.post<LoginResult>('/auth/login', { login: login.trim(), password }, { headers: { 'Accept-Language': locale } });
  }

  verifyTwoFactor(ticket: string, code: string, locale: 'en' | 'es' = 'es') {
    return this.client.post<Session>('/auth/login/verify-2fa', { ticket, code }, { headers: { 'Accept-Language': locale } });
  }

  register(payload: RegisterPayload) {
    return this.client.post<ApiMessage>('/auth/register', payload, { headers: { 'Accept-Language': payload.locale } });
  }

  verifyEmail(email: string, code: string, locale: 'en' | 'es') {
    return this.client.post<ApiMessage>('/auth/verify-email', { email, code }, { headers: { 'Accept-Language': locale } });
  }

  resendVerification(email: string, locale: 'en' | 'es') {
    return this.client.post<ApiMessage>('/auth/verify-email/resend', { email }, { headers: { 'Accept-Language': locale } });
  }

  forgotPassword(email: string, locale: 'en' | 'es') {
    return this.client.post<ApiMessage>('/auth/password/forgot', { email }, { headers: { 'Accept-Language': locale } });
  }

  resetPassword(payload: ResetPasswordPayload, locale: 'en' | 'es') {
    return this.client.post<ApiMessage>('/auth/password/reset', payload, { headers: { 'Accept-Language': locale } });
  }

  updateProfile(payload: ProfilePayload) {
    return this.client.patch<User>('/user', payload, this.auth());
  }

  setTwoFactor(enabled: boolean, password: string) {
    return this.client.post<ApiMessage>('/auth/2fa/' + (enabled ? 'enable' : 'disable'), { password }, this.auth());
  }

  getRestaurantSettings() {
    return this.client.get<{ data: RestaurantSettings }>('/admin/restaurant/configuration', this.auth());
  }

  updateRestaurantSettings(payload: Partial<RestaurantSettingsValues>) {
    return this.client.patch<{ data: RestaurantSettings }>('/admin/restaurant/configuration', payload, this.auth());
  }

  getRestaurants(page = 1) {
    return this.client.get<RestaurantPage>('/auth/super-admin/restaurants', { ...this.auth(), params: { page } });
  }

  getRestaurant(id: number) {
    return this.client.get<{ data: Restaurant }>('/auth/super-admin/restaurants/' + id, this.auth());
  }

  createRestaurant(payload: CreateRestaurantPayload) {
    return this.client.post<{ data: Restaurant }>('/auth/super-admin/restaurants', payload, this.auth());
  }

  updateRestaurant(id: number, payload: UpdateRestaurantPayload) {
    return this.client.put<{ data: Restaurant }>('/auth/super-admin/restaurants/' + id, payload, this.auth());
  }

  activateRestaurant(id: number) {
    return this.client.post<{ data: Restaurant }>('/auth/super-admin/restaurants/' + id + '/activate', {}, this.auth());
  }

  suspendRestaurant(id: number) {
    return this.client.post<{ data: Restaurant }>('/auth/super-admin/restaurants/' + id + '/suspend', {}, this.auth());
  }

  deleteRestaurant(id: number) {
    return this.client.delete<ApiMessage>('/auth/super-admin/restaurants/' + id, this.auth());
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
