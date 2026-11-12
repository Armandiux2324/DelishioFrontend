import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Role, Session, User } from './api.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storageKey = 'delishio.access_token';
  private readonly state = new BehaviorSubject<Session | null>(null);
  readonly session$ = this.state.asObservable();
  private accessToken: string | null = this.readToken();

  get token(): string | null { return this.accessToken; }
  get user(): User | null { return this.state.value?.user ?? null; }

  get role(): Role | null {
    const user = this.user;
    return user?.user_type === 'employee' ? user.employee?.role ?? null : user?.user_type ?? null;
  }

  get home(): string {
    if (this.role === null) return '/login';
    return {
      super_admin: '/super-admin', admin: '/admin', waiter: '/mesero',
      chef: '/chef', customer: '/cliente',
    }[this.role];
  }

  start(session: Session): void {
    this.accessToken = session.access_token;
    this.state.next(session);
    try {
      sessionStorage.setItem(this.storageKey, session.access_token);
    } catch {
      // Keep the session in memory when browser storage is unavailable.
    }
  }

  clear(): void {
    this.accessToken = null;
    this.state.next(null);
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // In-memory state is already cleared.
    }
  }

  private readToken(): string | null {
    try {
      return sessionStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }
}
