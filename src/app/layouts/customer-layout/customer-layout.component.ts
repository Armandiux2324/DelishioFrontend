import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-customer-layout',
  standalone: false,
  templateUrl: './customer-layout.component.html',
})
export class CustomerLayoutComponent {
  protected readonly session = inject(SessionService);
}
