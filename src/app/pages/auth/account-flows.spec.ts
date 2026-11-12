import { Location } from '@angular/common';
import { Type } from '@angular/core';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AxiosResponse } from 'axios';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';
import { AuthModule } from './auth.module';
import { RegisterComponent } from './register/register.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { ForgotPasswordComponent } from './recovery/forgot-password.component';
import { ResetPasswordComponent } from './recovery/reset-password.component';

const response = (data: unknown) => ({ data }) as AxiosResponse;
const failure = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

describe('Account flows', () => {
  let fixture: ComponentFixture<unknown>;
  let view: HTMLElement;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'register', 'verifyEmail', 'resendVerification', 'forgotPassword', 'resetPassword',
    ]);
    TestBed.configureTestingModule({
      imports: [AuthModule], providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(TestBed.inject(Location), 'getState').and.returnValue({ email: 'client@example.test', locale: 'es' });
  });

  afterEach(() => session.clear());

  function mount(component: Type<unknown>): void {
    fixture = TestBed.createComponent(component);
    view = fixture.nativeElement;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }
  function input(name: string, value: string): void {
    const element = view.querySelector<HTMLInputElement>('input[name="' + name + '"]')!;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }
  function submit(): void {
    view.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    flushMicrotasks();
    fixture.detectChanges();
  }
  function registerFields(): void {
    input('name', 'Cliente de prueba');
    input('username', 'cliente');
    input('email', 'CLIENT@example.test');
    input('phone', '5551234567');
    input('password', 'NewPassword123!');
    input('password_confirmation', 'NewPassword123!');
  }

  it('registers only Customer fields and carries email to verification without a token', fakeAsync(() => {
    api.register.and.resolveTo(response({ message: 'Created' }));
    mount(RegisterComponent);
    registerFields();
    submit();
    expect(api.register).toHaveBeenCalledOnceWith({
      name: 'Cliente de prueba', username: 'cliente', email: 'client@example.test', phone: '5551234567',
      locale: 'es', password: 'NewPassword123!', password_confirmation: 'NewPassword123!',
    });
    expect(navigate).toHaveBeenCalledWith(['/verify-email'], { state: { email: 'client@example.test', locale: 'es' } });
    expect(session.token).toBeNull();
    expect(view.querySelector<HTMLInputElement>('[name=password]')!.value).toBe('');
  }));

  it('blocks registration for mismatched passwords and invalid usernames', fakeAsync(() => {
    mount(RegisterComponent);
    registerFields();
    input('username', 'Not.Valid');
    input('password_confirmation', 'other');
    submit();
    expect(api.register).not.toHaveBeenCalled();
    expect(view.textContent).toContain('Las contraseñas deben coincidir');
  }));

  it('displays backend duplicate-email errors and clears passwords', fakeAsync(() => {
    api.register.and.rejectWith(failure(422, { message: 'Revisa tus datos', errors: { email: ['El correo ya está registrado.'] } }));
    mount(RegisterComponent);
    registerFields();
    submit();
    expect(view.querySelector('[role=alert]')?.textContent).toContain('El correo ya está registrado');
    expect(view.querySelector<HTMLInputElement>('[name=password]')!.value).toBe('');
    expect(session.token).toBeNull();
  }));

  it('verifies six-digit codes including leading zeroes without signing in automatically', fakeAsync(() => {
    api.verifyEmail.and.resolveTo(response({ message: 'Correo verificado correctamente' }));
    mount(VerifyEmailComponent);
    input('code', '012345');
    submit();
    expect(api.verifyEmail).toHaveBeenCalledOnceWith('client@example.test', '012345', 'es');
    expect(view.querySelector('form')).toBeNull();
    expect(view.textContent).toContain('Correo verificado correctamente');
    expect(session.token).toBeNull();
  }));

  it('keeps verification available for expired codes and resends a new code', fakeAsync(() => {
    api.verifyEmail.and.rejectWith(failure(400, { message: 'Código expirado' }));
    api.resendVerification.and.resolveTo(response({ message: 'Si la cuenta existe, se envió un nuevo código.' }));
    mount(VerifyEmailComponent);
    input('code', '012345');
    submit();
    expect(view.textContent).toContain('Código expirado');
    const resend = Array.from(view.querySelectorAll('button')).find(button => button.textContent?.includes('Reenviar'))!;
    resend.click();
    flushMicrotasks();
    fixture.detectChanges();
    expect(api.resendVerification).toHaveBeenCalledOnceWith('client@example.test', 'es');
    expect(view.querySelector('form')).not.toBeNull();
    expect(view.querySelector<HTMLInputElement>('[name=code]')!.value).toBe('');
  }));

  it('reports throttled requests without pretending a code was sent', fakeAsync(() => {
    api.forgotPassword.and.rejectWith(failure(429, {}));
    mount(ForgotPasswordComponent);
    submit();
    expect(view.querySelector('[role=alert]')?.textContent).toContain('Demasiados intentos');
    expect(navigate).not.toHaveBeenCalled();
  }));

  it('uses the same recovery transition for the generic account-existence response', fakeAsync(() => {
    api.forgotPassword.and.resolveTo(response({ message: 'Si la cuenta existe, se envió un código.' }));
    mount(ForgotPasswordComponent);
    submit();
    expect(api.forgotPassword).toHaveBeenCalledOnceWith('client@example.test', 'es');
    expect(navigate).toHaveBeenCalledWith(['/reset-password'], {
      state: { email: 'client@example.test', locale: 'es', notice: 'Si la cuenta existe, se envió un código.' },
    });
  }));

  it('resets a password and clears the local session belonging to that account', fakeAsync(() => {
    api.resetPassword.and.resolveTo(response({ message: 'Contraseña actualizada correctamente' }));
    session.start({ access_token: 'old', user: { id: 1, name: 'Cliente', email: 'client@example.test', locale: 'es', user_type: 'customer' } });
    mount(ResetPasswordComponent);
    input('code', '012345');
    input('password', 'NewPassword123!');
    input('password_confirmation', 'NewPassword123!');
    submit();
    expect(api.resetPassword).toHaveBeenCalledOnceWith({
      email: 'client@example.test', code: '012345', password: 'NewPassword123!', password_confirmation: 'NewPassword123!',
    }, 'es');
    expect(session.token).toBeNull();
    expect(view.querySelector('form')).toBeNull();
    expect(view.textContent).toContain('Contraseña actualizada correctamente');
  }));

  it('keeps reset available after an expired code and clears password fields', fakeAsync(() => {
    api.resetPassword.and.rejectWith(failure(400, { message: 'Código expirado' }));
    mount(ResetPasswordComponent);
    input('code', '012345');
    input('password', 'NewPassword123!');
    input('password_confirmation', 'NewPassword123!');
    submit();
    expect(view.textContent).toContain('Código expirado');
    expect(view.querySelector('form')).not.toBeNull();
    expect(view.querySelector<HTMLInputElement>('[name=password]')!.value).toBe('');
  }));

  it('preserves the selected English language for the registration form', fakeAsync(() => {
    (TestBed.inject(Location).getState as jasmine.Spy).and.returnValue({ locale: 'en' });
    mount(RegisterComponent);
    expect(view.querySelector('h1')?.textContent).toContain('Create a Customer account');
  }));
});
