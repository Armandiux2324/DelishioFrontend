import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AxiosResponse } from 'axios';
import { AppRoutingModule } from './app-routing.module';
import { ApiService } from './services/api.service';
import { Session } from './services/api.models';
import { SessionService } from './services/session.service';

describe('Delishio routing', () => {
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  const waiter: Session = {
    access_token: 'token',
    user: { id: 1, name: 'Mesero', user_type: 'employee', locale: 'es', employee: { role: 'waiter' } },
  };

  beforeEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getUser', 'getWaiterOrders', 'getRestaurants', 'getRestaurantSettings', 'getCatalog']);
    api.getCatalog.and.resolveTo({ data: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } } as never);
    api.getUser.and.resolveTo({ data: waiter.user } as AxiosResponse);
    api.getRestaurants.and.resolveTo({ data: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } } as never);
    api.getWaiterOrders.and.resolveTo({
      data: { data: [], meta: { current_page: 1, last_page: 1 } },
    } as AxiosResponse);
    TestBed.configureTestingModule({
      imports: [AppRoutingModule], providers: [{ provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
  });

  afterEach(() => session.clear());

  it('opens the login module from home and protects direct waiter access', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Iniciar sesión');
    await harness.navigateByUrl('/mesero');
    expect(TestBed.inject(Router).url).toBe('/login');
    await harness.navigateByUrl('/profile');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(api.getUser).not.toHaveBeenCalled();
  });

  it('restores a stored token using the backend user and loads the waiter module', async () => {
    sessionStorage.setItem('delishio.access_token', waiter.access_token);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppRoutingModule], providers: [{ provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
    expect(session.user).toBeNull();
    const harness = await RouterTestingHarness.create('/mesero');
    expect(api.getUser).toHaveBeenCalledTimes(1);
    expect(harness.routeNativeElement?.querySelector('#orders-title')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('app-session-header')).not.toBeNull();
  });

  it('redirects a waiter away from the admin area', async () => {
    session.start(waiter);
    const harness = await RouterTestingHarness.create('/admin');
    expect(TestBed.inject(Router).url).toBe('/mesero');
    expect(harness.routeNativeElement?.querySelector('#orders-title')).not.toBeNull();
  });

  it('discards revoked tokens before activating a protected layout', async () => {
    session.start(waiter);
    api.getUser.and.callFake(async () => {
      session.clear();
      throw { isAxiosError: true, response: { status: 401 } };
    });
    const harness = await RouterTestingHarness.create('/mesero');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(session.token).toBeNull();
    expect(harness.routeNativeElement?.querySelector('#orders-title')).toBeNull();
  });

  for (const [type, role, path] of [
    ['super_admin', null, '/super-admin'], ['employee', 'admin', '/admin'],
    ['employee', 'chef', '/chef'], ['customer', null, '/cliente'],
  ] as const) {
    it('loads the protected layout for ' + path, async () => {
      const user = { ...waiter.user, user_type: type, employee: role ? { role } : undefined };
      api.getUser.and.resolveTo({ data: user } as AxiosResponse);
      session.start({ ...waiter, user });
      const harness = await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe(path);
      expect(harness.routeNativeElement?.querySelector('app-session-header')).not.toBeNull();
    });
  }

  it('protects direct settings access and activates its navigation for an Administrator', async () => {
    const harness = await RouterTestingHarness.create('/admin/settings');
    expect(TestBed.inject(Router).url).toBe('/login');
    session.start(waiter);
    await harness.navigateByUrl('/admin/settings');
    expect(TestBed.inject(Router).url).toBe('/mesero');
    const user = { ...waiter.user, employee: { role: 'admin' as const } };
    session.start({ ...waiter, user });
    api.getUser.and.resolveTo({ data: user } as AxiosResponse);
    api.getRestaurantSettings.and.rejectWith(new Error('offline'));
    await harness.navigateByUrl('/admin/settings');
    expect(TestBed.inject(Router).url).toBe('/admin/settings');
    expect(harness.routeNativeElement?.querySelector('app-restaurant-settings')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('a[href="/admin/settings"]')?.getAttribute('aria-current')).toBe('page');
    expect(harness.routeNativeElement?.querySelector('a[href="/admin"]')?.getAttribute('aria-current')).toBeNull();
  });

  it('protects the catalog and keeps its parent navigation active across its three sections', async () => {
    const harness = await RouterTestingHarness.create('/admin/catalog');
    expect(TestBed.inject(Router).url).toBe('/login');
    session.start(waiter); await harness.navigateByUrl('/admin/catalog/categories');
    expect(TestBed.inject(Router).url).toBe('/mesero');
    const user = { ...waiter.user, employee: { role: 'admin' as const } };
    session.start({ ...waiter, user }); api.getUser.and.resolveTo({ data: user } as AxiosResponse);
    await harness.navigateByUrl('/admin/catalog');
    expect(TestBed.inject(Router).url).toBe('/admin/catalog/tax-classes');
    for (const [kind, title] of [['tax-classes', 'Clases de impuesto'], ['super-categories', 'Súper categorías'], ['categories', 'Categorías']]) {
      await harness.navigateByUrl('/admin/catalog/' + kind);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(title);
      expect(harness.routeNativeElement?.querySelector('a[href="/admin/catalog"]')?.getAttribute('aria-current')).toBe('page');
      expect(harness.routeNativeElement?.querySelector('.tabs a[aria-current="page"]')?.getAttribute('href')).toBe('/admin/catalog/' + kind);
    }
  });
});
