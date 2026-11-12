import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { RestaurantSettings } from '../../../services/restaurant-settings.models';
import { SessionService } from '../../../services/session.service';
import { AdminModule } from '../admin.module';
import { SettingsComponent } from './settings.component';

describe('Administrator restaurant settings', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  const settings: RestaurantSettings = {
    id: 10, name: 'Restaurant A', description: null, address: null, phone: null,
    logo_url: null, schedule: null, currency: 'USD', loyalty_enabled: false,
    loyalty_factor: null, loyalty_redeem_value: null, discount_limit_per_shift: null,
    courtesy_percentage: null, courtesy_daily_limit: null, dual_pricing_enabled: false,
    dual_pricing_percentage: null, timezone: 'America/New_York',
    overtime_weekly_hours: '40.00', overtime_multiplier: '1.50',
  };
  const response = (value = settings) => ({ data: { data: value } } as never);

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getRestaurantSettings', 'updateRestaurantSettings']);
    api.getRestaurantSettings.and.resolveTo(response());
    api.updateRestaurantSettings.and.resolveTo(response());
    TestBed.configureTestingModule({ imports: [AdminModule], providers: [
      provideRouter([]), { provide: ApiService, useValue: api },
    ] });
    session = TestBed.inject(SessionService);
    session.start({ access_token: 'admin-a', user: {
      id: 1, name: 'Admin', user_type: 'employee', locale: 'es', employee: { role: 'admin' },
    } });
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  afterEach(() => session.clear());

  it('loads all editable fields from the authenticated restaurant', () => {
    expect(api.getRestaurantSettings).toHaveBeenCalledOnceWith();
    expect(component['form'].controls.timezone.value).toBe('America/New_York');
    expect(component['form'].controls.loyalty_factor.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[name=restaurant_id]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[name=stripe_account_id]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('input,textarea,select').length).toBe(18);
  });

  it('sends only changed editable fields and preserves exact decimal strings', async () => {
    component['form'].patchValue({ name: ' Updated ', discount_limit_per_shift: '999999.99', courtesy_daily_limit: '0' });
    await component['save']();
    expect(api.updateRestaurantSettings).toHaveBeenCalledOnceWith({ name: 'Updated', discount_limit_per_shift: '999999.99', courtesy_daily_limit: 0 });
    expect(component['form'].pristine).toBeTrue();
    expect(component['saveState'].success()).toBe('Configuración guardada.');
    expect(session.user?.employee?.restaurant?.name).toBe(settings.name);
  });

  it('does not PATCH unchanged values', async () => {
    await component['save']();
    expect(api.updateRestaurantSettings).not.toHaveBeenCalled();
  });

  it('clears nullable text and limits explicitly while preserving zero', async () => {
    api.getRestaurantSettings.and.resolveTo(response({ ...settings, address: 'Street', courtesy_percentage: '5.00' }));
    await component['load']();
    component['form'].patchValue({ address: '', courtesy_percentage: '', discount_limit_per_shift: '0' });
    await component['save']();
    expect(api.updateRestaurantSettings).toHaveBeenCalledOnceWith({ address: null, courtesy_percentage: null, discount_limit_per_shift: '0' });
  });

  it('requires both positive factors when enabling loyalty', async () => {
    component['form'].controls.loyalty_enabled.setValue(true);
    component['updateToggles']();
    await component['save']();
    expect(api.updateRestaurantSettings).not.toHaveBeenCalled();
    component['form'].patchValue({ loyalty_factor: '1.2500', loyalty_redeem_value: '100.0000' });
    await component['save']();
    expect(api.updateRestaurantSettings).toHaveBeenCalledOnceWith({ loyalty_enabled: true, loyalty_factor: '1.2500', loyalty_redeem_value: '100.0000' });
  });

  it('requires a valid adjustment when enabling dual pricing', async () => {
    component['form'].controls.dual_pricing_enabled.setValue(true);
    component['updateToggles']();
    await component['save']();
    expect(api.updateRestaurantSettings).not.toHaveBeenCalled();
    component['form'].controls.dual_pricing_percentage.setValue('0');
    await component['save']();
    expect(api.updateRestaurantSettings).toHaveBeenCalledOnceWith({ dual_pricing_enabled: true, dual_pricing_percentage: '0' });
  });

  it('can disable a legacy out-of-range adjustment without resending it', async () => {
    api.getRestaurantSettings.and.resolveTo(response({ ...settings, dual_pricing_enabled: true, dual_pricing_percentage: '101.00' }));
    await component['load']();
    component['form'].controls.dual_pricing_enabled.setValue(false);
    component['updateToggles']();
    await component['save']();
    expect(api.updateRestaurantSettings).toHaveBeenCalledOnceWith({ dual_pricing_enabled: false });
  });

  for (const [field, value] of [
    ['name', '   '], ['phone', '1'.repeat(21)], ['logo_url', 'javascript:alert(1)'],
    ['description', 'é'.repeat(32768)], ['currency', 'EUR'],
    ['loyalty_factor', '0'], ['loyalty_redeem_value', '1.00001'],
    ['discount_limit_per_shift', '1000000'], ['discount_limit_per_shift', '1.001'],
    ['courtesy_percentage', '100.01'], ['courtesy_daily_limit', '1.5'],
    ['courtesy_daily_limit', '4294967296'], ['dual_pricing_percentage', '-1'],
    ['dual_pricing_percentage', '100.01'], ['timezone', ''],
    ['overtime_weekly_hours', '168.01'], ['overtime_multiplier', '0.99'],
  ] as const) {
    it(`rejects invalid ${field}: ${value.slice(0, 15)}`, async () => {
      component['form'].patchValue({ loyalty_enabled: true, loyalty_factor: '1', loyalty_redeem_value: '100', dual_pricing_enabled: true, dual_pricing_percentage: '3.50' });
      component['updateToggles']();
      component['form'].get(field)!.setValue(value);
      await component['save']();
      expect(api.updateRestaurantSettings).not.toHaveBeenCalled();
      expect(component['form'].get(field)!.invalid).toBeTrue();
    });
  }

  it('keeps edits and shows the currency conflict returned by Laravel', async () => {
    component['form'].controls.currency.setValue('MXN');
    api.updateRestaurantSettings.and.rejectWith({ isAxiosError: true, response: { status: 409, data: { message: 'La moneda no se puede cambiar después de abrir una caja.' } } });
    await component['save']();
    fixture.detectChanges();
    expect(component['form'].controls.currency.value).toBe('MXN');
    expect(component['saveState'].success()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('La moneda no se puede cambiar');
  });

  it('shows server timezone validation and allows correcting the input', async () => {
    component['form'].controls.timezone.setValue('Invalid/Zone');
    api.updateRestaurantSettings.and.rejectWith({ isAxiosError: true, response: { status: 422, data: { message: 'Zona inválida', errors: { timezone: ['Zona inválida'] } } } });
    await component['save']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#error-timezone').textContent).toContain('Zona inválida');
    expect(component['form'].controls.timezone.value).toBe('Invalid/Zone');
  });

  it('restores saved values when discarding edits', () => {
    component['form'].patchValue({ name: 'Unsaved', loyalty_enabled: true });
    component['updateToggles']();
    component['reset']();
    expect(component['form'].controls.name.value).toBe(settings.name);
    expect(component['form'].controls.loyalty_factor.disabled).toBeTrue();
  });

  it('prevents duplicate saves and disables the form while pending', async () => {
    let finish!: (value: never) => void;
    api.updateRestaurantSettings.and.returnValue(new Promise(resolve => finish = resolve));
    component['form'].controls.name.setValue('Updated');
    const pending = component['save']();
    await component['save']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBeTrue();
    expect(api.updateRestaurantSettings).toHaveBeenCalledTimes(1);
    finish(response());
    await pending;
  });

  it('allows retrying an unsuccessful initial load', async () => {
    api.getRestaurantSettings.and.rejectWith(new Error('offline'));
    await component['load']();
    expect(component['loadState'].error()).not.toBeNull();
    api.getRestaurantSettings.and.resolveTo(response());
    await component['load']();
    expect(component['loadState'].error()).toBeNull();
  });

  it('ignores responses from an earlier session', async () => {
    let finish!: (value: never) => void;
    api.getRestaurantSettings.and.returnValue(new Promise(resolve => finish = resolve));
    const pending = component['load']();
    session.start({ access_token: 'admin-b', user: session.user! });
    finish(response({ ...settings, name: 'Restaurant B' }));
    await pending;
    expect(component['form'].controls.name.value).toBe('Restaurant A');
  });

  it('clears rejected access and navigates to login', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    api.getRestaurantSettings.and.rejectWith({ isAxiosError: true, response: { status: 403 } });
    await component['load']();
    expect(session.token).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
