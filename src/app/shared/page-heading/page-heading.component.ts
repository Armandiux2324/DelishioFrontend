import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-heading',
  standalone: false,
  templateUrl: './page-heading.component.html',
  styleUrl: './page-heading.component.scss',
})
export class PageHeadingComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
