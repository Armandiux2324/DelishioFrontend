import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  protected readonly session = inject(SessionService);
}
