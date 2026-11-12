import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AxiosResponse } from 'axios';
import { ApiService } from '../../../services/api.service';
import { Role, Session } from '../../../services/api.models';
import { SessionService } from '../../../services/session.service';
import { AuthModule } from '../auth.module';
import { LoginComponent } from './login.component';

const response = (data: unknown) => ({ data }) as AxiosResponse;

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  let navigate: jasmine.Spy;
  let view: HTMLElement;
  const waiter: Session = {
    access_token: 'token',
    user: { id: 1, name: 'Mesero', user_type: 'employee', locale: 'es', employee: { role: 'waiter' } },
  };

  beforeEach(fakeAsync(() => {
    sessionStorage.removeItem('delishio.access_token');
    api = jasmine.createSpyObj<ApiService>('ApiService', ['login', 'verifyTwoFactor', 'logout']);
    api.login.and.resolveTo(response(waiter));
    api.logout.and.resolveTo(response({}));
    TestBed.configureTestingModule({
      imports: [AuthModule], providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    view = fixture.nativeElement;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  afterEach(() => session.clear());

  function input(name: string, value: string): void {
    const element = view.querySelector<HTMLInputElement>('input[name="' + name + '"]')!;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function submit(): void {
    view.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    tick();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function login(): void {
    tick();
    input('login', 'mesero');
    input('password', 'secret');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    submit();
  }

  it('starts the shared session and redirects the waiter', fakeAsync(() => {
    login();
    expect(api.login).toHaveBeenCalledOnceWith('mesero', 'secret');
    expect(session.user).toEqual(waiter.user);
    expect(navigate).toHaveBeenCalledOnceWith('/mesero');
    expect(view.querySelector<HTMLInputElement>('input[name="password"]')?.value).toBe('');
  }));

  it('waits for OTP before storing the token or navigating', fakeAsync(() => {
    api.login.and.resolveTo(response({ requires_2fa: true, ticket: 'challenge' }));
    api.verifyTwoFactor.and.resolveTo(response(waiter));
    login();
    expect(session.token).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    input('code', '012345');
    fixture.detectChanges();
    submit();
    expect(api.verifyTwoFactor).toHaveBeenCalledOnceWith('challenge', '012345');
    expect(navigate).toHaveBeenCalledWith('/mesero');
  }));

  it('shows invalid credentials without storing a session', fakeAsync(() => {
    api.login.and.rejectWith(new Error('Invalid credentials'));
    login();
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('No se pudo iniciar sesión');
    expect(session.token).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  }));

  for (const [role, home] of [
    ['super_admin', '/super-admin'], ['admin', '/admin'], ['chef', '/chef'], ['customer', '/cliente'],
  ] as [Role, string][]) {
    it('redirects ' + role + ' to its area', fakeAsync(() => {
      const user = { ...waiter.user };
      if (role === 'super_admin' || role === 'customer') {
        user.user_type = role;
        delete user.employee;
      } else {
        user.employee = { role: role as 'admin' | 'chef' };
      }
      api.login.and.resolveTo(response({ ...waiter, user }));
      login();
      expect(navigate).toHaveBeenCalledWith(home);
    }));
  }
});
