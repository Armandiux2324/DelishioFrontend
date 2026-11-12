import { TestBed } from '@angular/core/testing';
import axios, { AxiosAdapter, AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { SessionService } from './session.service';

describe('ApiService using Axios', () => {
  let originalAdapter: typeof axios.defaults.adapter;
  let adapter: jasmine.Spy<AxiosAdapter>;
  let api: ApiService;
  let session: SessionService;

  beforeEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    originalAdapter = axios.defaults.adapter;
    adapter = jasmine.createSpy<AxiosAdapter>('adapter').and.callFake(async config => ({
      data: {}, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config,
    }));
    axios.defaults.adapter = adapter;
    TestBed.configureTestingModule({});
    session = TestBed.inject(SessionService);
    session.start({
      access_token: 'token',
      user: { id: 1, name: 'Waiter', user_type: 'employee', locale: 'es', employee: { role: 'waiter' } },
    });
    api = TestBed.inject(ApiService);
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    session.clear();
  });

  function reject(config: InternalAxiosRequestConfig, status = 401): Promise<AxiosResponse> {
    return Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      config, status, statusText: 'Unauthorized', data: {}, headers: new AxiosHeaders(),
    }));
  }

  it('uses the environment URL and sends login and OTP without bearer credentials', async () => {
    await api.login(' mesero ', 'secret');
    let config = adapter.calls.mostRecent().args[0];
    expect(config.baseURL).toBe(environment.apiUrl);
    expect(config.url).toBe('/auth/login');
    expect(config.method).toBe('post');
    expect(JSON.parse(config.data)).toEqual({ login: 'mesero', password: 'secret' });
    expect(config.headers.get('Authorization')).toBeUndefined();
    await api.verifyTwoFactor('ticket', '012345');
    config = adapter.calls.mostRecent().args[0];
    expect(config.url).toBe('/auth/login/verify-2fa');
    expect(JSON.parse(config.data)).toEqual({ ticket: 'ticket', code: '012345' });
    expect(config.headers.get('Authorization')).toBeUndefined();
  });

  it('uses the shared token for profile, pagination, checkout preview and logout', async () => {
    await api.getUser();
    expect(adapter.calls.mostRecent().args[0].url).toBe('/user');
    await api.getWaiterOrders(2);
    expect(adapter.calls.mostRecent().args[0].params).toEqual({ page: 2 });
    await api.getCheckoutPreview(42);
    const preview = adapter.calls.mostRecent().args[0];
    expect(preview.url).toBe('/waiter/orders/42/checkout-preview');
    expect(preview.method).toBe('post');
    expect(JSON.parse(preview.data)).toEqual({ payments: [] });
    await api.logout();
    expect(adapter.calls.mostRecent().args[0].url).toBe('/auth/logout');
    for (const [config] of adapter.calls.allArgs()) {
      expect(config.headers.get('Authorization')).toBe('Bearer token');
    }
  });

  it('clears a rejected authenticated token but propagates the error', async () => {
    adapter.and.callFake(config => reject(config));
    await expectAsync(api.getUser()).toBeRejected();
    expect(session.token).toBeNull();
    expect(sessionStorage.getItem('delishio.access_token')).toBeNull();
  });

  it('preserves the session when a public login is rejected or the server fails', async () => {
    adapter.and.callFake(config => reject(config));
    await expectAsync(api.login('other', 'wrong')).toBeRejected();
    expect(session.token).toBe('token');
    adapter.and.callFake(config => reject(config, 500));
    await expectAsync(api.getUser()).toBeRejected();
    expect(session.token).toBe('token');
  });

  it('ignores a late 401 belonging to an earlier session', async () => {
    let rejectOld!: (error: unknown) => void;
    let requestConfig!: InternalAxiosRequestConfig;
    adapter.and.callFake(config => {
      requestConfig = config;
      return new Promise((_resolve, rejectRequest) => rejectOld = rejectRequest);
    });
    const request = api.getUser();
    session.start({ access_token: 'new-token', user: session.user! });
    const expectation = expectAsync(request).toBeRejected();
    rejectOld(new AxiosError('Expired', 'ERR_BAD_REQUEST', requestConfig, undefined, {
      config: requestConfig, status: 401, statusText: 'Unauthorized', data: {}, headers: new AxiosHeaders(),
    }));
    await expectation;
    expect(session.token).toBe('new-token');
  });
  it('uses public endpoints, JSON and locale headers for the account flows', async () => {
    const payload = {
      name: 'Customer', username: null, email: 'client@example.test', phone: '123',
      locale: 'en' as const, password: 'password123', password_confirmation: 'password123',
    };
    await api.register(payload);
    await api.verifyEmail(payload.email, '012345', 'en');
    await api.resendVerification(payload.email, 'en');
    await api.forgotPassword(payload.email, 'en');
    await api.resetPassword({
      email: payload.email, code: '012345', password: payload.password, password_confirmation: payload.password,
    }, 'en');
    expect(adapter.calls.allArgs().map(([config]) => config.url)).toEqual([
      '/auth/register', '/auth/verify-email', '/auth/verify-email/resend',
      '/auth/password/forgot', '/auth/password/reset',
    ]);
    for (const [config] of adapter.calls.allArgs()) {
      expect(config.method).toBe('post');
      expect(config.headers.get('Authorization')).toBeUndefined();
      expect(config.headers.get('Accept')).toBe('application/json');
      expect(config.headers.get('Accept-Language')).toBe('en');
    }
    expect(JSON.parse(adapter.calls.first().args[0].data)).toEqual(payload);
    expect(JSON.parse(adapter.calls.argsFor(1)[0].data).code).toBe('012345');
  });

  it('updates the profile with PATCH and authorizes 2FA changes with the current password', async () => {
    const payload = { name: 'Updated', username: null, locale: 'es' as const, phone: null };
    await api.updateProfile(payload);
    expect(adapter.calls.mostRecent().args[0].method).toBe('patch');
    expect(adapter.calls.mostRecent().args[0].url).toBe('/user');
    expect(JSON.parse(adapter.calls.mostRecent().args[0].data)).toEqual(payload);
    await api.setTwoFactor(true, 'current-password');
    expect(adapter.calls.mostRecent().args[0].url).toBe('/auth/2fa/enable');
    await api.setTwoFactor(false, 'current-password');
    expect(adapter.calls.mostRecent().args[0].url).toBe('/auth/2fa/disable');
    for (const [config] of adapter.calls.allArgs()) {
      expect(config.headers.get('Authorization')).toBe('Bearer token');
    }
    expect(JSON.parse(adapter.calls.mostRecent().args[0].data)).toEqual({ password: 'current-password' });
  });


  it('uses authenticated restaurant endpoints, pagination and PUT for editing', async () => {
    const payload = { name: 'Test', address: 'Street', phone: '123', logo_url: null, stripe_account_id: null };
    await api.getRestaurants(2);
    await api.getRestaurant(12);
    await api.createRestaurant({ name: 'Test', address: 'Street', phone: '123', admin_name: 'Admin', admin_email: 'a@example.test', admin_password: 'Password123!', admin_password_confirmation: 'Password123!' });
    await api.updateRestaurant(12, payload);
    await api.activateRestaurant(12);
    await api.suspendRestaurant(12);
    await api.deleteRestaurant(12);
    const calls = adapter.calls.allArgs().map(([config]) => config);
    expect(calls.map(config => config.method)).toEqual(['get', 'get', 'post', 'put', 'post', 'post', 'delete']);
    expect(calls.map(config => config.url)).toEqual(['', '/12', '', '/12', '/12/activate', '/12/suspend', '/12'].map(path => '/auth/super-admin/restaurants' + path));
    expect(calls[0].params).toEqual({ page: 2 });
    expect(JSON.parse(calls[3].data)).toEqual(payload);
    for (const config of calls) expect(config.headers.get('Authorization')).toBe('Bearer token');
  });

  it('reads and PATCHes the authenticated restaurant configuration without tenant identifiers', async () => {
    await api.getRestaurantSettings();
    await api.updateRestaurantSettings({ timezone: 'America/New_York', dual_pricing_enabled: true, dual_pricing_percentage: '3.50' });
    const calls = adapter.calls.allArgs().map(([config]) => config);
    expect(calls.map(config => config.url)).toEqual(['/admin/restaurant/configuration', '/admin/restaurant/configuration']);
    expect(calls.map(config => config.method)).toEqual(['get', 'patch']);
    expect(JSON.parse(calls[1].data)).toEqual({ timezone: 'America/New_York', dual_pricing_enabled: true, dual_pricing_percentage: '3.50' });
    for (const config of calls) {
      expect(config.headers.get('Authorization')).toBe('Bearer token');
      expect(config.params).toBeUndefined();
    }
  });

  it('uses the real catalog resources, PUT updates and authenticated pagination', async () => {
    const payloads = {
      'tax-classes': { name: 'Tax', percentage: '8.25' },
      'super-categories': { name: 'Food', tax_class_id: 10 },
      categories: { name: 'Lunch', super_category_id: 20, description: null },
    };
    for (const kind of ['tax-classes', 'super-categories', 'categories'] as const) {
      adapter.calls.reset();
      await api.getCatalog(kind, 2); await api.getCatalogRecord(kind, 30);
      await api.createCatalog(kind, payloads[kind]); await api.updateCatalog(kind, 30, payloads[kind]);
      await api.deleteCatalog(kind, 30);
      const calls = adapter.calls.allArgs().map(([config]) => config);
      expect(calls.map(config => config.url)).toEqual(['', '/30', '', '/30', '/30'].map(path => '/admin/' + kind + path));
      expect(calls.map(config => config.method)).toEqual(['get', 'get', 'post', 'put', 'delete']);
      expect(calls[0].params).toEqual({ page: 2 });
      expect(JSON.parse(calls[2].data)).toEqual(payloads[kind]);
      expect(JSON.parse(calls[3].data)).toEqual(payloads[kind]);
      for (const config of calls) expect(config.headers.get('Authorization')).toBe('Bearer token');
    }
  });

  it('uses authenticated inventory endpoints, partial PUT and immutable loss requests', async () => {
    await api.getInventoryItems(2); await api.getInventoryItem(10);
    await api.createInventoryItem({ name:'Flour',unit:'kg',unit_cost:'12.3456',current_stock:'15.125' });
    await api.updateInventoryItem(10,{ current_stock:'0' }); await api.deleteInventoryItem(10);
    await api.getInventoryLosses(3); await api.getInventoryLoss(20);
    await api.createInventoryLoss({inventory_item_id:10,quantity:'0.125',reason:'Damaged'});
    const calls=adapter.calls.allArgs().map(([config])=>config);
    expect(calls.map(config=>config.method)).toEqual(['get','get','post','put','delete','get','get','post']);
    expect(calls.map(config=>config.url)).toEqual(['/admin/inventory-items','/admin/inventory-items/10','/admin/inventory-items','/admin/inventory-items/10','/admin/inventory-items/10','/admin/inventory-losses','/admin/inventory-losses/20','/admin/inventory-losses']);
    expect(calls[0].params).toEqual({page:2});expect(calls[5].params).toEqual({page:3});
    expect(JSON.parse(calls[3].data)).toEqual({current_stock:'0'});
    expect(JSON.parse(calls[7].data)).toEqual({inventory_item_id:10,quantity:'0.125',reason:'Damaged'});
    for(const config of calls)expect(config.headers.get('Authorization')).toBe('Bearer token');
  });

 it('uses authenticated menu routes, PUT changes and exact recipe payloads',async()=>{
  await api.getMenuItems(2);await api.getMenuItem(30);await api.createMenuItem({name:'Bread',category_id:10,sale_price:'15.25',description:null,image_url:null,legal_age_required:true,preparation_station:'bar',active:true,ingredients:[{inventory_item_id:20,quantity:'0.125'}]});await api.updateMenuItem(30,{ingredients:[],active:false});await api.deleteMenuItem(30);
  const calls=adapter.calls.allArgs().map(([config])=>config);expect(calls.map(config=>config.method)).toEqual(['get','get','post','put','delete']);expect(calls.map(config=>config.url)).toEqual(['/admin/menu-items','/admin/menu-items/30','/admin/menu-items','/admin/menu-items/30','/admin/menu-items/30']);expect(calls[0].params).toEqual({page:2});expect(JSON.parse(calls[2].data).ingredients).toEqual([{inventory_item_id:20,quantity:'0.125'}]);expect(JSON.parse(calls[3].data)).toEqual({ingredients:[],active:false});for(const config of calls)expect(config.headers.get('Authorization')).toBe('Bearer token');
 });

 it('uses employee user IDs, authenticated pagination and partial PUT',async()=>{await api.getEmployees(2);await api.getEmployee(20);await api.createEmployee({name:'Chef',email:'chef@example.test',username:null,phone:null,locale:'es',role:'chef',station:'bar',hourly_rate:'12.50',active:true,password:'Password123!',password_confirmation:'Password123!',pin:'004821'});await api.updateEmployee(20,{role:'waiter'});await api.deleteEmployee(20);const calls=adapter.calls.allArgs().map(([config])=>config);expect(calls.map(config=>config.method)).toEqual(['get','get','post','put','delete']);expect(calls.map(config=>config.url)).toEqual(['/admin/employees','/admin/employees/20','/admin/employees','/admin/employees/20','/admin/employees/20']);expect(calls[0].params).toEqual({page:2});expect(JSON.parse(calls[2].data).pin).toBe('004821');expect(JSON.parse(calls[3].data)).toEqual({role:'waiter'});for(const config of calls)expect(config.headers.get('Authorization')).toBe('Bearer token');});

 it('uses read-only customer routes and authenticated promotion CRUD with PUT',async()=>{await api.getAdminCustomers(2);await api.getAdminCustomer(40);await api.getPromotions(3);await api.getPromotion(30);await api.createPromotion({name:'Deal',condition_type:'category_discount',condition_value:null,discount_type:'percentage',discount_value:'10.50',days_of_week:'Mon,Tue',time_start:'22:00:00',time_end:'02:00:00',valid_from:'2026-11-01',valid_to:'2026-12-31',active:true,menu_item_ids:[20],category_ids:[10]});await api.updatePromotion(30,{menu_item_ids:[],category_ids:[]});await api.deletePromotion(30);const calls=adapter.calls.allArgs().map(([config])=>config);expect(calls.map(config=>config.method)).toEqual(['get','get','get','get','post','put','delete']);expect(calls.map(config=>config.url)).toEqual(['/admin/customers','/admin/customers/40','/admin/promotions','/admin/promotions/30','/admin/promotions','/admin/promotions/30','/admin/promotions/30']);expect(calls[0].params).toEqual({page:2});expect(calls[2].params).toEqual({page:3});expect(JSON.parse(calls[4].data).condition_value).toBeNull();expect(JSON.parse(calls[5].data)).toEqual({menu_item_ids:[],category_ids:[]});for(const config of calls)expect(config.headers.get('Authorization')).toBe('Bearer token');});

 it('uses real shift/cash endpoints and sends only operation inputs',async()=>{await api.getWorkShifts(2);await api.clockIn();await api.clockOut(10);await api.getCashRegisters(3);await api.getCashRegister(20);await api.openCashRegister('100.00');await api.closeCashRegister(20,'90.00');await api.getCashMovements(4);await api.getCashMovement(30);await api.createCashMovement({cash_register_id:20,type:'cash_out',amount:'10.50',reason:'other'});const calls=adapter.calls.allArgs().map(([config])=>config);expect(calls.map(config=>config.url)).toEqual(['/work-shifts','/work-shifts','/work-shifts/10/clock-out','/cash-registers','/cash-registers/20','/cash-registers','/cash-registers/20/close','/admin/cash-movements','/admin/cash-movements/30','/admin/cash-movements']);expect(calls[0].params).toEqual({page:2});expect(JSON.parse(calls[1].data)).toEqual({});expect(JSON.parse(calls[2].data)).toEqual({});expect(JSON.parse(calls[5].data)).toEqual({opening_amount:'100.00'});expect(JSON.parse(calls[6].data)).toEqual({counted_cash:'90.00'});expect(JSON.parse(calls[9].data)).toEqual({cash_register_id:20,type:'cash_out',amount:'10.50',reason:'other'});for(const config of calls)expect(config.headers.get('Authorization')).toBe('Bearer token');});
});
