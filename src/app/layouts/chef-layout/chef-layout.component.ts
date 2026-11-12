import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-chef-layout',
  standalone: false,
  templateUrl: './chef-layout.component.html',
})
export class ChefLayoutComponent {
  protected readonly session = inject(SessionService);
}
