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
});
