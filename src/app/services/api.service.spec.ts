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
});
