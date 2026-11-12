import { Component, inject, Input, signal } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { NavigationItem } from '../navigation/navigation.component';

@Component({
  selector: 'app-shell',
  standalone: false,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  host: {
    '[attr.data-mode]': 'mode',
    '[attr.lang]': "session.user?.locale === 'en' ? 'en' : 'es'",
  },
})
export class AppShellComponent {
  @Input() mode: 'admin' | 'customer' = 'admin';
  @Input({ required: true }) area = '';
  @Input({ required: true }) navigation: NavigationItem[] = [];
  protected readonly session = inject(SessionService);
  protected readonly menuOpen = signal(false);
}
