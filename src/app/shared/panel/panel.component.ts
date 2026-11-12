import { Component } from '@angular/core';

@Component({
  selector: 'app-panel',
  standalone: false,
  template: '<ng-content />',
  styles: [`
    :host {
      display: block;
      background: var(--d-panel);
      border: 1px solid var(--d-line);
      border-radius: var(--d-radius);
      box-shadow: var(--d-shadow);
      overflow: hidden;
    }
  `],
})
export class PanelComponent {}
