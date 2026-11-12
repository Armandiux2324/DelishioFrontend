import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-waiter-layout',
  standalone: false,
  styles: ['.operation-links { display:flex; gap:.75rem; flex-wrap:wrap; padding:1rem; }'],
  templateUrl: './waiter-layout.component.html',
})
export class WaiterLayoutComponent {
  protected readonly session = inject(SessionService);
}
