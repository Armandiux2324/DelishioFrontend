import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-chef-layout',
  standalone: false,
  styles: [':host{display:block;background:#101722;--d-surface:#101722;--d-panel:#1c2736;--d-ink:#f5f7fb;--d-muted:#b4c1d2;--d-line:#405066;--d-brand:#a8caff;--d-brand-soft:#223a59}app-session-header{display:block;padding:.75rem 1rem}.operation-links { display:flex; gap:.75rem; flex-wrap:wrap; padding:1rem; }'],
  templateUrl: './chef-layout.component.html',
})
export class ChefLayoutComponent {
  protected readonly session = inject(SessionService);
}
