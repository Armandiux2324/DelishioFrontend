import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AxiosResponse } from 'axios';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';
import { SharedModule } from '../shared.module';
import { SessionHeaderComponent } from './session-header.component';

describe('SessionHeaderComponent', () => {
  let fixture: ComponentFixture<SessionHeaderComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    api = jasmine.createSpyObj<ApiService>('ApiService', ['logout']);
    TestBed.configureTestingModule({
      imports: [SharedModule], providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
    session.start({
      access_token: 'token',
      user: { id: 1, name: 'Waiter', user_type: 'employee', locale: 'es', employee: { role: 'waiter' } },
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(SessionHeaderComponent);
    fixture.detectChanges();
  });

  afterEach(() => session.clear());

  it('revokes the token before clearing the session and returning to login', fakeAsync(() => {
    api.logout.and.resolveTo({ data: {} } as AxiosResponse);
    fixture.nativeElement.querySelector('button').click();
    tick();
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(session.token).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('keeps the active session and allows retry when revocation fails', fakeAsync(() => {
    api.logout.and.rejectWith(new Error('offline'));
    fixture.nativeElement.querySelector('button').click();
    tick();
    fixture.detectChanges();
    expect(session.token).toBe('token');
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se pudo cerrar');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeFalse();
  }));
});
