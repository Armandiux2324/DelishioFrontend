import { Component, inject } from '@angular/core';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-chef-layout',
  standalone: false,
  styles: ['.operation-links { display:flex; gap:.75rem; flex-wrap:wrap; padding:1rem; }'],
  templateUrl: './chef-layout.component.html',
})
export class ChefLayoutComponent {
  protected readonly session = inject(SessionService);
}
