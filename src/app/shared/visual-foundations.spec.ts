import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DialogComponent } from './dialog/dialog.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { SharedModule } from './shared.module';

@Component({
  standalone: false,
  template: `
    <button id="opener" dButton variant="secondary" (click)="dialog.open()">Open</button>
    <app-dialog #dialog title="Navigation" closeLabel="Close navigation">
      <label class="d-field" for="dialog-search">Search<input id="dialog-search" class="d-input"></label>
    </app-dialog>
    <app-dialog title="Second dialog" />
    <app-feedback [kind]="kind" title="Test state" message="Test message" />
    <app-navigation [english]="true" label="Customer navigation" [items]="items" />
  `,
})
class VisualTestComponent {
  @ViewChild('dialog') dialog!: DialogComponent;
  kind: FeedbackComponent['kind'] = 'pending';
  items = [
    { label: { es: 'Restaurantes', en: 'Restaurants' }, icon: 'building-2', route: '/cliente' },
    { label: { es: 'Pedidos', en: 'Orders' }, icon: 'receipt-text' },
  ];
}

describe('Visual foundations', () => {
  let fixture: ComponentFixture<VisualTestComponent>;
  let view: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VisualTestComponent],
      imports: [SharedModule],
      providers: [provideRouter([{ path: 'cliente', children: [] }])],
    });
    fixture = TestBed.createComponent(VisualTestComponent);
    view = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('preserves native button semantics and renders unavailable sections without links', () => {
    const opener = view.querySelector<HTMLButtonElement>('#opener')!;
    expect(opener.classList.contains('d-button')).toBeTrue();
    expect(opener.dataset['variant']).toBe('secondary');
    const nav = view.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Customer navigation');
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/cliente');
    const pending = nav.querySelector<HTMLButtonElement>('button')!;
    expect(pending.disabled).toBeTrue();
    expect(pending.textContent).toContain('Orders');
    expect(pending.textContent).toContain('Coming soon');
    expect(pending.getAttribute('href')).toBeNull();
  });

  it('keeps the current section highlighted when its query parameters change', async () => {
    await TestBed.inject(Router).navigateByUrl('/cliente?from=profile');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(view.querySelector('nav a')?.getAttribute('aria-current')).toBe('page');
  });

  it('assigns unique labels and restores focus after closing the native dialog', async () => {
    const dialogs = view.querySelectorAll<HTMLDialogElement>('dialog');
    expect(dialogs[0].id).not.toBe(dialogs[1].id);
    const opener = view.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    const dialog = dialogs[0];
    expect(dialog.open).toBeTrue();
    expect(dialog.contains(document.activeElement)).toBeTrue();
    expect(view.querySelector('#' + dialog.getAttribute('aria-labelledby'))?.textContent).toBe('Navigation');
    const closed = new Promise<void>(resolve => dialog.addEventListener('close', () => resolve(), { once: true }));
    dialog.querySelector<HTMLButtonElement>('button')!.click();
    await closed;
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(opener);
  });

  it('keeps a dialog open for content clicks and dismisses it from the backdrop', async () => {
    fixture.componentInstance.dialog.open();
    const dialog = view.querySelector<HTMLDialogElement>('dialog')!;
    dialog.querySelector('input')!.click();
    expect(dialog.open).toBeTrue();
    const closed = new Promise<void>(resolve => dialog.addEventListener('close', () => resolve(), { once: true }));
    dialog.click();
    await closed;
    expect(dialog.open).toBeFalse();
  });

  it('announces loading and errors with the corresponding accessible roles', () => {
    fixture.componentInstance.kind = 'loading';
    fixture.detectChanges();
    expect(view.querySelector('app-feedback [role="status"]')?.getAttribute('aria-busy')).toBe('true');
    fixture.componentInstance.kind = 'error';
    fixture.detectChanges();
    expect(view.querySelector('app-feedback [role="alert"]')?.textContent).toContain('Test message');
    const icons = view.querySelectorAll('app-feedback svg');
    expect(icons.length).toBe(1);
    expect(icons[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('prevents dismissing a dialog while its operation is pending', () => {
    const component = fixture.componentInstance.dialog;
    component.busy = true;
    component.open();
    fixture.detectChanges();
    const dialog = view.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.querySelector<HTMLButtonElement>('button')!.disabled).toBeTrue();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBeTrue();
    dialog.click();
    expect(dialog.open).toBeTrue();
    component.close();
    expect(dialog.open).toBeFalse();
  });
});
