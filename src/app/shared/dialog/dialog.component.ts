import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';

let nextDialogId = 0;

@Component({
  selector: 'app-dialog',
  standalone: false,
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  @Input({ required: true }) title = '';
  @Input() closeLabel = 'Cerrar';
  @Input() kind: 'sheet' | 'drawer' = 'sheet';
  @Input() busy = false;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  readonly id = 'd-dialog-' + nextDialogId++;
  private readonly document = inject(DOCUMENT);
  private opener: HTMLElement | null = null;

  open(): void {
    if (this.dialog.nativeElement.open) return;
    this.opener = this.document.activeElement as HTMLElement | null;
    this.dialog.nativeElement.showModal();
  }

  close(): void {
    this.dialog.nativeElement.close();
  }

  protected backdrop(event: MouseEvent): void {
    if (!this.busy && event.target === this.dialog.nativeElement) this.close();
  }

  protected cancel(event: Event): void {
    if (this.busy) event.preventDefault();
  }

  protected afterClose(): void {
    if (this.opener?.isConnected) this.opener.focus();
    this.closed.emit();
  }
}
