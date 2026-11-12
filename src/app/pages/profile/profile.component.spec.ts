import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AxiosResponse } from 'axios';
import { ApiService } from '../../services/api.service';
import { User } from '../../services/api.models';
import { SessionService } from '../../services/session.service';
import { ProfileComponent } from './profile.component';
import { ProfileModule } from './profile.module';

const response = (data: unknown) => ({ data }) as AxiosResponse;
const customer: User = {
  id: 1, name: 'Cliente', email: 'client@example.test', username: 'cliente', locale: 'es',
  user_type: 'customer', customer: { phone: '5551234567' }, two_factor_enabled: false,
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let view: HTMLElement;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    api = jasmine.createSpyObj<ApiService>('ApiService', ['updateProfile', 'setTwoFactor', 'logout']);
    TestBed.configureTestingModule({
      imports: [ProfileModule], providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
    session.start({ access_token: 'token', user: customer });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => session.clear());

  function mount(): void {
    fixture = TestBed.createComponent(ProfileComponent);
    view = fixture.nativeElement;
    fixture.detectChanges();
  }
  function input(selector: string, value: string): void {
    const element = view.querySelector<HTMLInputElement>(selector)!;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }
  function submit(index = 0): void {
    view.querySelectorAll('form')[index].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    flushMicrotasks();
    fixture.detectChanges();
  }

  it('sends only editable fields and publishes the updated name and locale', fakeAsync(() => {
    api.updateProfile.and.resolveTo(response({ ...customer, name: 'Updated', locale: 'en', customer: { phone: null } }));
    mount();
    input('#profile-name', 'Updated');
    input('#profile-phone', '');
    const locale = view.querySelector<HTMLSelectElement>('#profile-locale')!;
    locale.value = 'en';
    locale.dispatchEvent(new Event('change', { bubbles: true }));
    submit();
    expect(api.updateProfile).toHaveBeenCalledOnceWith({ name: 'Updated', username: 'cliente', locale: 'en', phone: null });
    expect(session.user?.name).toBe('Updated');
    expect(view.querySelector('h1')?.textContent).toBe('My profile');
    expect(view.querySelector<HTMLInputElement>('#profile-email')!.readOnly).toBeTrue();
  }));

  it('keeps forced Super Admin 2FA and excludes the phone from updates', fakeAsync(() => {
    const user: User = { ...customer, user_type: 'super_admin', customer: undefined, two_factor_enabled: false };
    session.start({ access_token: 'token', user });
    api.updateProfile.and.resolveTo(response(user));
    mount();
    expect(view.querySelector('#profile-phone')).toBeNull();
    expect(view.querySelector('#two-factor')).toBeNull();
    expect(view.textContent).toContain('2FA obligatorio y permanente');
    submit();
    expect(api.updateProfile).toHaveBeenCalledOnceWith({ name: 'Cliente', username: 'cliente', locale: 'es' });
    expect(api.setTwoFactor).not.toHaveBeenCalled();
  }));

  it('reads employee contact details without posting their role or restaurant', fakeAsync(() => {
    const user: User = { ...customer, user_type: 'employee', customer: undefined, employee: { role: 'chef', phone: '123' } };
    session.start({ access_token: 'token', user });
    api.updateProfile.and.resolveTo(response({ ...user, employee: { role: 'chef', phone: '456' } }));
    mount();
    expect(view.querySelector<HTMLInputElement>('#profile-phone')!.value).toBe('123');
    input('#profile-phone', '456');
    submit();
    expect(api.updateProfile).toHaveBeenCalledOnceWith({ name: 'Cliente', username: 'cliente', locale: 'es', phone: '456' });
    expect(session.user?.employee?.role).toBe('chef');
  }));

  it('keeps the session profile unchanged after backend validation rejects the update', fakeAsync(() => {
    api.updateProfile.and.rejectWith({
      isAxiosError: true, response: { status: 422, data: { message: 'Error', errors: { username: ['Usuario ocupado'] } } },
    });
    mount();
    input('#profile-username', 'ocupado');
    submit();
    expect(view.querySelector('[role=alert]')?.textContent).toContain('Usuario ocupado');
    expect(session.user?.username).toBe('cliente');
    expect(navigate).not.toHaveBeenCalled();
  }));

  it('requires the current password and updates 2FA only after the backend succeeds', fakeAsync(() => {
    api.setTwoFactor.and.rejectWith({
      isAxiosError: true, response: { status: 422, data: { message: 'Contraseña incorrecta' } },
    });
    mount();
    const toggle = view.querySelector<HTMLInputElement>('#two-factor')!;
    toggle.click();
    fixture.detectChanges();
    submit(1);
    expect(api.setTwoFactor).not.toHaveBeenCalled();
    input('#security-password', 'wrong');
    submit(1);
    expect(session.user?.two_factor_enabled).toBeFalse();
    expect(view.textContent).toContain('Contraseña incorrecta');
    expect(view.querySelector<HTMLInputElement>('#security-password')!.value).toBe('');
    api.setTwoFactor.and.resolveTo(response({ message: 'Autenticación de dos factores activada' }));
    input('#security-password', 'correct-password');
    submit(1);
    expect(api.setTwoFactor).toHaveBeenCalledWith(true, 'correct-password');
    expect(session.user?.two_factor_enabled).toBeTrue();
    toggle.click();
    fixture.detectChanges();
    input('#security-password', 'correct-password');
    submit(1);
    expect(api.setTwoFactor).toHaveBeenCalledWith(false, 'correct-password');
    expect(session.user?.two_factor_enabled).toBeFalse();
  }));

  it('returns expired sessions to login', fakeAsync(() => {
    api.updateProfile.and.rejectWith({ isAxiosError: true, response: { status: 401, data: {} } });
    mount();
    submit();
    expect(session.token).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('does not clear a newer login after an old request fails', fakeAsync(() => {
    let rejectRequest!: (reason: unknown) => void;
    api.updateProfile.and.returnValue(new Promise((_resolve, reject) => rejectRequest = reject));
    mount();
    submit();
    session.start({ access_token: 'new-token', user: { ...customer, id: 2 } });
    rejectRequest({ isAxiosError: true, response: { status: 401, data: {} } });
    flushMicrotasks();
    expect(session.token).toBe('new-token');
    expect(navigate).not.toHaveBeenCalled();
  }));

  it('serializes profile and security mutations', fakeAsync(() => {
    let finish!: (value: AxiosResponse<User>) => void;
    api.updateProfile.and.returnValue(new Promise(resolve => finish = resolve));
    mount();
    submit();
    view.querySelector<HTMLInputElement>('#two-factor')!.click();
    input('#security-password', 'correct-password');
    submit(1);
    expect(api.setTwoFactor).not.toHaveBeenCalled();
    finish(response(customer));
    flushMicrotasks();
    expect(session.token).toBe('token');
  }));
});
