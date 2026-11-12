import { Component, inject, Input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-session-header',
  standalone: false,
  templateUrl: './session-header.component.html',
  styleUrl: './session-header.component.scss',
})
export class SessionHeaderComponent {
  @Input() area = '';
  protected readonly session = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected async logout(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await this.api.logout();
      this.session.clear();
      await this.router.navigate(['/login']);
    } catch {
      if (!this.session.token) {
        await this.router.navigate(['/login']);
      } else {
        this.failed.set(true);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
