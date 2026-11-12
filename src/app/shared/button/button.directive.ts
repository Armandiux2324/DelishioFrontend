import { Directive, Input } from '@angular/core';

@Directive({
  selector: 'button[dButton], a[dButton]',
  standalone: false,
  host: { class: 'd-button', '[attr.data-variant]': 'variant' },
})
export class ButtonDirective {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
}
