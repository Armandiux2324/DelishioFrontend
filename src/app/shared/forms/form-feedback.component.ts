import { Component, Input } from '@angular/core';
import { ApiFormState } from './api-form-state';

@Component({
  selector: 'app-form-feedback',
  standalone: false,
  template: `
    @if (state.busy()) { <p role="status">{{ english ? 'Loading…' : 'Cargando…' }}</p> }
    @if (state.error(); as error) {
      <div class="error" role="alert">
        <p>{{ error.message }}</p>
        @for (field of error.fields | keyvalue; track field.key) {
          @for (message of field.value; track $index) { <p>{{ message }}</p> }
        }
      </div>
    }
    @if (state.success()) { <p class="success" role="status">{{ state.success() }}</p> }
  `,
  styles: [`
    :host { display: block; }
    p { margin: .5rem 0; overflow-wrap: anywhere; font-size: .875rem; }
    .error { color: var(--d-danger); }
    .success { color: var(--d-success); }
  `],
})
export class FormFeedbackComponent {
  @Input({ required: true }) state!: ApiFormState;
  @Input() english = false;
}
