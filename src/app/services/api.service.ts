import { CashMovement, CashMovementPayload, CashRegister, OperationsPage, WorkShift } from './operations.models';
import { AdminCustomer, AdminPage, Promotion, PromotionPayload } from './customer-promotion.models';
import { Employee, EmployeeCreate, EmployeeCreated, EmployeePage, EmployeeUpdate } from './employee.models';
import { MenuItem, MenuItemPayload, MenuItemsPage } from './menu-item.models';
import { InventoryItem, InventoryLoss, InventoryLossPayload, InventoryPage, InventoryPayload } from './inventory.models';
import { CatalogKind, CatalogPage, CatalogPayloads, CatalogRecords } from './catalog.models';
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

  getCatalog<K extends CatalogKind>(kind: K, page = 1) {
    return this.client.get<CatalogPage<CatalogRecords[K]>>('/admin/' + kind, { ...this.auth(), params: { page } });
  }

  getCatalogRecord<K extends CatalogKind>(kind: K, id: number) {
    return this.client.get<{ data: CatalogRecords[K] }>('/admin/' + kind + '/' + id, this.auth());
  }

  createCatalog<K extends CatalogKind>(kind: K, payload: CatalogPayloads[K]) {
    return this.client.post<{ data: CatalogRecords[K] }>('/admin/' + kind, payload, this.auth());
  }

  updateCatalog<K extends CatalogKind>(kind: K, id: number, payload: CatalogPayloads[K]) {
    return this.client.put<{ data: CatalogRecords[K] }>('/admin/' + kind + '/' + id, payload, this.auth());
  }

  deleteCatalog(kind: CatalogKind, id: number) {
    return this.client.delete<void>('/admin/' + kind + '/' + id, this.auth());
  }

  getInventoryItems(page = 1) { return this.client.get<InventoryPage<InventoryItem>>('/admin/inventory-items', { ...this.auth(), params: { page } }); }
  getInventoryItem(id: number) { return this.client.get<{ data: InventoryItem }>('/admin/inventory-items/' + id, this.auth()); }
  createInventoryItem(payload: InventoryPayload) { return this.client.post<{ data: InventoryItem }>('/admin/inventory-items', payload, this.auth()); }
  updateInventoryItem(id: number, payload: Partial<InventoryPayload>) { return this.client.put<{ data: InventoryItem }>('/admin/inventory-items/' + id, payload, this.auth()); }
  deleteInventoryItem(id: number) { return this.client.delete<void>('/admin/inventory-items/' + id, this.auth()); }
  getInventoryLosses(page = 1) { return this.client.get<InventoryPage<InventoryLoss>>('/admin/inventory-losses', { ...this.auth(), params: { page } }); }
  getInventoryLoss(id: number) { return this.client.get<{ data: InventoryLoss }>('/admin/inventory-losses/' + id, this.auth()); }
  createInventoryLoss(payload: InventoryLossPayload) { return this.client.post<{ data: InventoryLoss }>('/admin/inventory-losses', payload, this.auth()); }

  getMenuItems(page = 1) { return this.client.get<MenuItemsPage>('/admin/menu-items', { ...this.auth(), params: { page } }); }
  getMenuItem(id: number) { return this.client.get<{ data: MenuItem }>('/admin/menu-items/' + id, this.auth()); }
  createMenuItem(payload: MenuItemPayload) { return this.client.post<{ data: MenuItem }>('/admin/menu-items', payload, this.auth()); }
  updateMenuItem(id: number, payload: Partial<MenuItemPayload>) { return this.client.put<{ data: MenuItem }>('/admin/menu-items/' + id, payload, this.auth()); }
  deleteMenuItem(id: number) { return this.client.delete<void>('/admin/menu-items/' + id, this.auth()); }

  getEmployees(page = 1) { return this.client.get<EmployeePage>('/admin/employees', { ...this.auth(), params: { page } }); }
  getEmployee(id: number) { return this.client.get<{data:Employee}>('/admin/employees/' + id, this.auth()); }
  createEmployee(payload: EmployeeCreate) { return this.client.post<EmployeeCreated>('/admin/employees', payload, this.auth()); }
  updateEmployee(id: number, payload: EmployeeUpdate) { return this.client.put<{data:Employee}>('/admin/employees/' + id, payload, this.auth()); }
  deleteEmployee(id: number) { return this.client.delete<void>('/admin/employees/' + id, this.auth()); }

  getAdminCustomers(page = 1) { return this.client.get<AdminPage<AdminCustomer>>('/admin/customers', { ...this.auth(), params: { page } }); }
  getAdminCustomer(id: number) { return this.client.get<{data:AdminCustomer}>('/admin/customers/' + id, this.auth()); }
  getPromotions(page = 1) { return this.client.get<AdminPage<Promotion>>('/admin/promotions', { ...this.auth(), params: { page } }); }
  getPromotion(id: number) { return this.client.get<{data:Promotion}>('/admin/promotions/' + id, this.auth()); }
  createPromotion(payload: PromotionPayload) { return this.client.post<{data:Promotion}>('/admin/promotions', payload, this.auth()); }
  updatePromotion(id: number, payload: Partial<PromotionPayload>) { return this.client.put<{data:Promotion}>('/admin/promotions/' + id, payload, this.auth()); }
  deletePromotion(id: number) { return this.client.delete<void>('/admin/promotions/' + id, this.auth()); }

  getWorkShifts(page = 1) { return this.client.get<OperationsPage<WorkShift>>('/work-shifts', { ...this.auth(), params: { page } }); }
  clockIn() { return this.client.post<{data:WorkShift}>('/work-shifts', {}, this.auth()); }
  clockOut(id: number) { return this.client.post<{data:WorkShift}>('/work-shifts/' + id + '/clock-out', {}, this.auth()); }
  getCashRegisters(page = 1) { return this.client.get<OperationsPage<CashRegister>>('/cash-registers', { ...this.auth(), params: { page } }); }
  getCashRegister(id: number) { return this.client.get<{data:CashRegister}>('/cash-registers/' + id, this.auth()); }
  openCashRegister(opening_amount: string) { return this.client.post<{data:CashRegister}>('/cash-registers', {opening_amount}, this.auth()); }
  closeCashRegister(id: number, counted_cash: string) { return this.client.post<{data:CashRegister}>('/cash-registers/' + id + '/close', {counted_cash}, this.auth()); }
  getCashMovements(page = 1) { return this.client.get<OperationsPage<CashMovement>>('/admin/cash-movements', { ...this.auth(), params: { page } }); }
  getCashMovement(id: number) { return this.client.get<{data:CashMovement}>('/admin/cash-movements/' + id, this.auth()); }
  createCashMovement(payload: CashMovementPayload) { return this.client.post<{data:CashMovement}>('/admin/cash-movements', payload, this.auth()); }

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
