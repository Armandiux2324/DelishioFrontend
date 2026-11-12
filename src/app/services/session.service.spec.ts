import { SessionService } from './session.service';
import { Session } from './api.models';

describe('SessionService', () => {
  const session: Session = {
    access_token: 'token',
    user: { id: 1, name: 'Admin', user_type: 'employee', locale: 'es', employee: { role: 'admin' } },
  };

  beforeEach(() => sessionStorage.removeItem('delishio.access_token'));
  afterEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    sessionStorage.removeItem('unrelated');
  });

  it('publishes changes and restores only the token until the server validates the user', () => {
    const service = new SessionService();
    const states: (Session | null)[] = [];
    service.session$.subscribe(value => states.push(value));
    service.start(session);
    expect(service.role).toBe('admin');
    expect(service.home).toBe('/admin');
    const restored = new SessionService();
    expect(restored.token).toBe('token');
    expect(restored.user).toBeNull();
    sessionStorage.setItem('unrelated', 'keep');
    service.clear();
    expect(states).toEqual([null, session, null]);
    expect(new SessionService().token).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('supports in-memory login and logout when session storage is blocked', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('Blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('Blocked');
    const service = new SessionService();
    service.start(session);
    expect(service.token).toBe('token');
    expect(service.role).toBe('admin');
    service.clear();
    expect(service.token).toBeNull();
  });
});
