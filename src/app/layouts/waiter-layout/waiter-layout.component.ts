import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-waiter-layout',
  standalone: false,
  templateUrl: './waiter-layout.component.html',
})
export class WaiterLayoutComponent {
  protected readonly session = inject(SessionService);
}
