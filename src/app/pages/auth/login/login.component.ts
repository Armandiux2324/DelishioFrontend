import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Session } from '../../../services/api.models';
import { SessionService } from '../../../services/session.service';

const labels = {
  es: {
    title: 'Iniciar sesión', login: 'Usuario o correo', password: 'Contraseña',
    code: 'Código de verificación', verify: 'Verificar código', back: 'Volver',
    working: 'Cargando…', credentials: 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
    codeError: 'No se pudo verificar el código. Inténtalo de nuevo o vuelve a iniciar sesión.',
  },
  en: {
    title: 'Sign in', login: 'Username or email', password: 'Password',
    code: 'Verification code', verify: 'Verify code', back: 'Back',
    working: 'Loading…', credentials: 'Unable to sign in. Check your details and try again.',
    codeError: 'Unable to verify the code. Try again or sign in again.',
  },
};

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  protected password = '';
  protected readonly language = signal<'es' | 'en'>('es');
  protected readonly t = computed(() => labels[this.language()]);
  protected readonly ticket = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected async signIn(login: string, password: string): Promise<void> {
    this.password = '';
    await this.run(async () => {
      const { data } = await this.api.login(login, password);
      if ('requires_2fa' in data) {
        this.ticket.set(data.ticket);
      } else {
        await this.startSession(data);
      }
    });
  }

  protected async verify(code: string): Promise<void> {
    const ticket = this.ticket();
    if (ticket === null) return;
    await this.run(async () => {
      const { data } = await this.api.verifyTwoFactor(ticket, code);
      await this.startSession(data);
    });
  }

  protected cancelVerification(): void {
    this.ticket.set(null);
    this.failed.set(false);
  }

  private async startSession(session: Session): Promise<void> {
    this.session.start(session);
    if (this.session.role === null) {
      await this.api.logout().finally(() => this.session.clear());
      throw new Error('Unsupported role');
    }
    const navigated = await this.router.navigateByUrl(this.session.home);
    if (!navigated) throw new Error('Navigation rejected');
    this.ticket.set(null);
  }

  private async run(work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await work();
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
