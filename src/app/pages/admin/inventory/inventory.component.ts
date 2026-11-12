import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { InventoryItem, InventoryLoss, InventoryPayload, InventoryUnit, inventoryUnits } from '../../../services/inventory.models';
import { SessionService } from '../../../services/session.service';
import { DialogComponent } from '../../../shared/dialog/dialog.component';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { inventoryCopy } from './inventory-copy';

@Component({ selector: 'app-inventory', standalone: false, templateUrl: './inventory.component.html', styleUrl: './inventory.component.scss' })
export class InventoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly lossesView = inject(ActivatedRoute).snapshot.data['losses'] === true;
  protected readonly locale = this.session.user?.locale === 'en' ? 'en' : 'es';
  protected readonly text = inventoryCopy[this.locale];
  protected readonly units = inventoryUnits;
  protected readonly itemFields = ['name', 'unit', 'unit_cost', 'current_stock'] as const;
  protected readonly loadState = new ApiFormState(() => this.locale);
  protected readonly actionState = new ApiFormState(() => this.locale);
  protected readonly busy = computed(() => this.loadState.busy() || this.actionState.busy());
  protected readonly items = signal<InventoryItem[]>([]);
  protected readonly losses = signal<InventoryLoss[]>([]);
  protected readonly options = signal<InventoryItem[]>([]);
  protected readonly selected = signal<InventoryItem | null>(null);
  protected readonly lossDetail = signal<InventoryLoss | null>(null);
  protected readonly ready = signal(false);
  protected readonly notice = signal('');
  protected readonly pagination = signal({ current_page: 1, last_page: 1, total: 0 });
  protected readonly itemForm = this.builder.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    unit: this.builder.control<InventoryUnit>('kg', [Validators.required, Validators.pattern(/^(g|kg|oz|lb|ml|l|fl_oz|gal|pza)$/)]),
    unit_cost: ['', [Validators.required, Validators.pattern(/^\d+(?:\.\d{1,4})?$/), Validators.min(0), Validators.max(999999.9999)]],
    current_stock: ['', [Validators.required, Validators.pattern(/^\d+(?:\.\d{1,3})?$/), Validators.min(0), Validators.max(999999999.999)]],
  });
  protected readonly lossForm = this.builder.group({
    inventory_item_id: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    quantity: ['', [Validators.required, Validators.pattern(/^\d+(?:\.\d{1,3})?$/), Validators.min(0.001), Validators.max(999999999.999)]],
    reason: ['', [Validators.required, Validators.pattern(/\S/), (control: AbstractControl) => new TextEncoder().encode(control.value).length > 65535 ? { bytes: true } : null]],
  });
  @ViewChild('editor', { static: true }) protected editor!: DialogComponent;
  @ViewChild('lossEditor', { static: true }) protected lossEditor!: DialogComponent;
  @ViewChild('details', { static: true }) protected details!: DialogComponent;
  @ViewChild('confirmation', { static: true }) protected confirmation!: DialogComponent;
  @ViewChild('addButton', { static: true }) private addButton!: ElementRef<HTMLButtonElement>;

  ngOnInit(): void { void this.loadPage(1); }

  protected async loadPage(page: number): Promise<void> {
    if (this.busy() || !Number.isSafeInteger(page) || page < 1) return;
    await this.request(this.loadState, async token => {
      if (this.lossesView) {
        let [response, options] = await Promise.all([this.api.getInventoryLosses(page), this.loadOptions()]);
        if (response.data.meta.current_page > response.data.meta.last_page) response = await this.api.getInventoryLosses(response.data.meta.last_page);
        if (this.session.token !== token) return;
        this.losses.set(response.data.data); this.options.set(options); this.pagination.set(response.data.meta);
      } else {
        let response = await this.api.getInventoryItems(page);
        if (response.data.meta.current_page > response.data.meta.last_page) response = await this.api.getInventoryItems(response.data.meta.last_page);
        if (this.session.token !== token) return;
        this.items.set(response.data.data); this.pagination.set(response.data.meta);
      }
    });
  }

  protected async openItem(item?: InventoryItem): Promise<void> {
    if (this.busy()) return;
    this.notice.set(''); this.ready.set(false); this.selected.set(item ?? null); this.editor.open();
    await this.request(this.actionState, async token => {
      const fresh = item ? (await this.api.getInventoryItem(item.id)).data.data : null;
      if (this.session.token !== token) return;
      this.selected.set(fresh);
      this.itemForm.reset({ name: fresh?.name ?? '', unit: fresh?.unit ?? 'kg', unit_cost: fresh?.unit_cost ?? '', current_stock: fresh?.current_stock ?? '' });
      this.ready.set(true);
    });
  }

  protected async saveItem(): Promise<void> {
    if (this.busy() || !this.ready()) return;
    if (this.itemForm.invalid) { this.itemForm.markAllAsTouched(); return; }
    const value = this.itemForm.getRawValue();
    value.name = value.name.trim();
    const selected = this.selected();
    let saved = false;
    await this.request(this.actionState, async token => {
      if (selected) {
        const payload = Object.fromEntries(Object.entries(value).filter(([key, entry]) => entry !== selected[key as keyof InventoryPayload]));
        if (Object.keys(payload).length) await this.api.updateInventoryItem(selected.id, payload);
      } else await this.api.createInventoryItem(value);
      if (this.session.token !== token) return;
      this.editor.close(); this.notice.set(selected ? this.text.updated : this.text.created); saved = true;
    });
    if (saved) await this.reload();
  }

  protected async openLoss(): Promise<void> {
    if (this.busy()) return;
    this.notice.set(''); this.ready.set(false); this.lossForm.reset(); this.lossEditor.open();
    await this.request(this.actionState, async token => {
      const options = await this.loadOptions();
      if (this.session.token !== token) return;
      this.options.set(options); this.ready.set(true);
    });
  }

  protected async saveLoss(): Promise<void> {
    if (this.busy() || !this.ready()) return;
    if (!this.options().some(item => item.id === Number(this.lossForm.controls.inventory_item_id.value))) this.lossForm.controls.inventory_item_id.setErrors({ unavailable: true });
    if (this.lossForm.invalid) { this.lossForm.markAllAsTouched(); return; }
    const value = this.lossForm.getRawValue();
    let saved = false;
    await this.request(this.actionState, async token => {
      await this.api.createInventoryLoss({ inventory_item_id: Number(value.inventory_item_id), quantity: value.quantity, reason: value.reason.trim() });
      if (this.session.token !== token) return;
      this.lossEditor.close(); this.notice.set(this.text.lossCreated); saved = true;
    });
    if (saved) await this.reload();
  }

  protected async showLoss(loss: InventoryLoss): Promise<void> {
    if (this.busy()) return;
    this.lossDetail.set(null); this.details.open();
    await this.request(this.actionState, async token => {
      const { data } = await this.api.getInventoryLoss(loss.id);
      if (this.session.token === token) this.lossDetail.set(data.data);
    });
  }

  protected prepareDelete(item: InventoryItem): void {
    if (this.busy()) return;
    this.notice.set(''); this.selected.set(item); this.actionState.error.set(null); this.confirmation.open();
  }

  protected async remove(): Promise<void> {
    const item = this.selected(); if (this.busy() || !item) return;
    let removed = false;
    await this.request(this.actionState, async token => {
      await this.api.deleteInventoryItem(item.id);
      if (this.session.token !== token) return;
      this.confirmation.close(); this.notice.set(this.text.deleted); removed = true;
    });
    if (removed) await this.reload();
  }

  protected ingredientName(id: number): string { return this.options().find(item => item.id === id)?.name ?? this.text.ingredient + ' #' + id; }
  protected date(value: string): string { return new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  private async reload(): Promise<void> { await this.loadPage(this.pagination().current_page); this.addButton.nativeElement.focus(); }
  private async loadOptions(): Promise<InventoryItem[]> {
    const items: InventoryItem[] = []; let page = 1; let last = 1;
    do { const { data } = await this.api.getInventoryItems(page); items.push(...data.data); last = data.meta.last_page; page++; } while (page <= last);
    return items;
  }
  private async request(state: ApiFormState, work: (token: string | null) => Promise<void>): Promise<void> {
    const token = this.session.token; await state.run(() => work(token));
    if ([401, 403].includes(state.error()?.status ?? 0) && (this.session.token === token || this.session.token === null)) { this.session.clear(); await this.router.navigate(['/login']); }
  }
}
