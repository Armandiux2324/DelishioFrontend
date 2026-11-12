import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-feedback',
  standalone: false,
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
  host: { '[attr.data-kind]': 'kind' },
})
export class FeedbackComponent {
  @Input() kind: 'empty' | 'pending' | 'loading' | 'error' = 'empty';
  @Input() title = '';
  @Input({ required: true }) message = '';
}
