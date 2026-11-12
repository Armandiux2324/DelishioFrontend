import { Component, inject } from '@angular/core';
import { customerNavigation } from '../layout-navigation';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-customer-layout',
  standalone: false,
  templateUrl: './customer-layout.component.html',
})
export class CustomerLayoutComponent {
  protected readonly navigation = customerNavigation;
  protected readonly session = inject(SessionService);
}
