import { Component, inject } from '@angular/core';
import { superAdminNavigation } from '../layout-navigation';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-super-admin-layout',
  standalone: false,
  templateUrl: './super-admin-layout.component.html',
})
export class SuperAdminLayoutComponent {
  protected readonly navigation = superAdminNavigation;
  protected readonly session = inject(SessionService);
}
