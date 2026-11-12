import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface NavigationItem {
  label: { es: string; en: string };
  icon: string;
  route?: string;
}

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  host: { '[attr.data-appearance]': 'appearance' },
})
export class NavigationComponent {
  @Input({ required: true }) items: NavigationItem[] = [];
  @Input() english = false;
  @Input() label = 'Navegación';
  @Input() appearance: 'sidebar' | 'tabs' | 'drawer' = 'sidebar';
  @Output() followed = new EventEmitter<void>();
}
