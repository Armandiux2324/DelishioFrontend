import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Restaurant, RestaurantPage } from '../../../services/restaurant.models';
import { SessionService } from '../../../services/session.service';
import { SuperAdminModule } from '../super-admin.module';
import { RestaurantsComponent } from './restaurants.component';

describe('Super Admin restaurants', () => {
  let fixture: ComponentFixture<RestaurantsComponent>;
  let component: RestaurantsComponent;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  const restaurant: Restaurant = {
    id: 12, name: 'Delishio', address: 'Main street', phone: '5551234',
    description: null, schedule: null, logo_url: null, stripe_account_id: null,
    currency: 'USD', status: 'active', created_at: null,
  };
  const response = <T>(data: T) => ({ data } as never);
  const page = (current = 1, last = 1): RestaurantPage => ({
    data: [restaurant], meta: { current_page: current, last_page: last, total: 21 },
  });
  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'getRestaurants', 'getRestaurant', 'createRestaurant', 'updateRestaurant',
      'activateRestaurant', 'suspendRestaurant', 'deleteRestaurant',
    ]);
    api.getRestaurants.and.resolveTo(response(page()));
    for (const method of ['getRestaurant', 'createRestaurant', 'updateRestaurant', 'activateRestaurant', 'suspendRestaurant'] as const) {
      api[method].and.resolveTo(response({ data: restaurant }));
    }
    api.deleteRestaurant.and.resolveTo(response({ message: 'Deleted' }));
    TestBed.configureTestingModule({ imports: [SuperAdminModule], providers: [
      provideRouter([]), { provide: ApiService, useValue: api },
    ] });
    session = TestBed.inject(SessionService);
    session.start({ access_token: 'super-token', user: { id: 1, name: 'Super', user_type: 'super_admin', locale: 'es' } });
    fixture = TestBed.createComponent(RestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  afterEach(() => session.clear());

  function createForm(): void {
    component['openEditor']();
    component['form'].patchValue({ name: ' New ', address: ' Street ', phone: ' 123 ',
      admin_name: ' Admin ', admin_email: 'ADMIN@example.test',
      admin_password: 'Password123!', admin_password_confirmation: 'Password123!',
    });
    fixture.detectChanges();
  }

  it('loads the real page and renders nullable fields without invented administrator data', async () => {
    expect(api.getRestaurants).toHaveBeenCalledOnceWith(1);
    expect(fixture.nativeElement.textContent).toContain('Delishio');
    await component['showDetails'](restaurant);
    fixture.detectChanges();
    expect(api.getRestaurant).toHaveBeenCalledOnceWith(12);
    expect(fixture.nativeElement.textContent).toContain('Sin información');
    expect(component['createdAt'](null)).toBe('Sin información');
  });

  it('creates the restaurant and administrator with only the supported payload', async () => {
    createForm();
    await component['save']();
    expect(api.createRestaurant).toHaveBeenCalledOnceWith({
      name: 'New', address: 'Street', phone: '123', admin_name: 'Admin', admin_email: 'admin@example.test',
      admin_password: 'Password123!', admin_password_confirmation: 'Password123!',
    });
    expect(component['form'].controls.admin_password.value).toBe('');
    expect(api.getRestaurants).toHaveBeenCalledTimes(2);
  });

  it('blocks mismatched passwords and incomplete input', async () => {
    createForm();
    component['form'].controls.admin_password_confirmation.setValue('different');
    await component['save']();
    expect(api.createRestaurant).not.toHaveBeenCalled();
    expect(component['form'].hasError('passwordMismatch')).toBeTrue();
  });

  it('shows server field errors and keeps the form open while clearing secrets', async () => {
    createForm();
    api.createRestaurant.and.rejectWith({ isAxiosError: true, response: { status: 422, data: {
      message: 'Correo duplicado', errors: { admin_email: ['Correo duplicado'] },
    } } });
    await component['save']();
    fixture.detectChanges();
    expect(component['formState'].error()?.fields['admin_email']).toEqual(['Correo duplicado']);
    expect(fixture.nativeElement.querySelectorAll('dialog')[1].open).toBeTrue();
    expect(component['form'].controls.admin_password.value).toBe('');
  });

  it('clears the password when the editor is dismissed', async () => {
    createForm();
    component['editor'].close();
    await new Promise<void>(resolve => fixture.nativeElement.querySelectorAll('dialog')[1].addEventListener('close', () => resolve(), { once: true }));
    expect(component['form'].controls.admin_password.value).toBe('');
  });

  it('updates supported fields and explicitly clears optional values', async () => {
    component['openEditor'](restaurant);
    await component['save']();
    expect(api.updateRestaurant).toHaveBeenCalledOnceWith(12, {
      name: 'Delishio', address: 'Main street', phone: '5551234', logo_url: null, stripe_account_id: null,
    });
    expect(api.createRestaurant).not.toHaveBeenCalled();
  });

  it('rejects an invalid Stripe account before sending an update', async () => {
    component['openEditor'](restaurant);
    component['form'].controls.stripe_account_id.setValue('invalid');
    await component['save']();
    expect(api.updateRestaurant).not.toHaveBeenCalled();
  });

  for (const action of ['activate', 'suspend', 'delete'] as const) {
    it(`requires explicit confirmation to ${action}`, async () => {
      await component['showDetails'](restaurant);
      component['prepareAction'](action);
      const method = { activate: api.activateRestaurant, suspend: api.suspendRestaurant, delete: api.deleteRestaurant }[action];
      expect(method).not.toHaveBeenCalled();
      await component['confirmAction']();
      expect(method).toHaveBeenCalledOnceWith(12);
      expect(fixture.nativeElement.querySelectorAll('dialog')[2].open).toBeFalse();
    });
  }

  it('does not repeat an action while its request is pending', async () => {
    await component['showDetails'](restaurant);
    component['prepareAction']('suspend');
    let finish!: (value: never) => void;
    api.suspendRestaurant.and.returnValue(new Promise(resolve => finish = resolve));
    const pending = component['confirmAction']();
    await component['confirmAction']();
    expect(api.suspendRestaurant).toHaveBeenCalledTimes(1);
    finish(response({ data: { ...restaurant, status: 'suspended' } }));
    await pending;
  });

  it('preserves the confirmation and selected record if deletion fails', async () => {
    await component['showDetails'](restaurant);
    component['prepareAction']('delete');
    api.deleteRestaurant.and.rejectWith(new Error('offline'));
    await component['confirmAction']();
    expect(component['selected']()?.id).toBe(12);
    expect(fixture.nativeElement.querySelectorAll('dialog')[2].open).toBeTrue();
    expect(component['actionState'].error()).not.toBeNull();
  });

  it('returns to the last available page after deleting its final row', async () => {
    await component['loadPage'](2);
    component['pagination'].set({ current_page: 2, last_page: 2, total: 21 });
    await component['showDetails'](restaurant);
    component['prepareAction']('delete');
    api.getRestaurants.and.returnValues(Promise.resolve(response({ data: [], meta: { current_page: 2, last_page: 1, total: 20 } })), Promise.resolve(response(page())));
    await component['confirmAction']();
    expect(api.getRestaurants.calls.allArgs().slice(-2)).toEqual([[2], [1]]);
    expect(component['pagination']().current_page).toBe(1);
  });

  it('ignores a response belonging to an earlier session', async () => {
    let finish!: (value: never) => void;
    api.getRestaurants.and.returnValue(new Promise(resolve => finish = resolve));
    const pending = component['loadPage'](2);
    session.start({ access_token: 'new-token', user: session.user! });
    finish(response({ data: [], meta: { current_page: 2, last_page: 2, total: 0 } }));
    await pending;
    expect(component['restaurants']()).toEqual([restaurant]);
  });

  it('clears rejected access and returns to login', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    api.getRestaurants.and.rejectWith({ isAxiosError: true, response: { status: 403 } });
    await component['loadPage'](1);
    expect(session.token).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
