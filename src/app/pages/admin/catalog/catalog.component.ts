import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CatalogKind, CatalogPayloads, CatalogRecord } from '../../../services/catalog.models';
import { SessionService } from '../../../services/session.service';
import { DialogComponent } from '../../../shared/dialog/dialog.component';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { catalogCopy } from './catalog-copy';

@Component({
  selector: 'app-catalog', standalone: false,
  templateUrl: './catalog.component.html', styleUrl: './catalog.component.scss',
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly kind = inject(ActivatedRoute).snapshot.data['catalogKind'] as CatalogKind;
  protected readonly kinds: CatalogKind[] = ['tax-classes', 'super-categories', 'categories'];
  protected readonly locale = this.session.user?.locale === 'en' ? 'en' : 'es';
  protected readonly text = catalogCopy[this.locale];
  protected readonly listState = new ApiFormState(() => this.locale);
  protected readonly editorState = new ApiFormState(() => this.locale);
  protected readonly deleteState = new ApiFormState(() => this.locale);
  protected readonly busy = computed(() => this.listState.busy() || this.editorState.busy() || this.deleteState.busy());
  protected readonly records = signal<CatalogRecord[]>([]);
  protected readonly parents = signal<CatalogRecord[]>([]);
  protected readonly pagination = signal({ current_page: 1, last_page: 1, total: 0 });
  protected readonly selected = signal<CatalogRecord | null>(null);
  protected readonly ready = signal(false);
  protected readonly notice = signal('');
  protected readonly form = this.builder.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    percentage: ['', [Validators.required, Validators.pattern(/^\d+(?:\.\d{1,2})?$/), Validators.min(0), Validators.max(999.99)]],
    parent: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    description: ['', (control: AbstractControl) => new TextEncoder().encode(control.value).length > 65535 ? { bytes: true } : null],
  });
  @ViewChild('editor', { static: true }) protected editor!: DialogComponent;
  @ViewChild('confirmation', { static: true }) protected confirmation!: DialogComponent;
  @ViewChild('addButton', { static: true }) private addButton!: ElementRef<HTMLButtonElement>;

  ngOnInit(): void {
    if (this.kind === 'tax-classes') this.form.controls.parent.disable();
    else this.form.controls.percentage.disable();
    if (this.kind !== 'categories') this.form.controls.description.disable();
    void this.loadPage(1);
  }

  protected async loadPage(page: number): Promise<void> {
    if (!Number.isSafeInteger(page) || page < 1 || this.busy()) return;
    await this.request(this.listState, async token => {
      let [response, parents] = await Promise.all([this.api.getCatalog(this.kind, page), this.loadParents()]);
      if (response.data.meta.current_page > response.data.meta.last_page) response = await this.api.getCatalog(this.kind, response.data.meta.last_page);
      if (this.session.token !== token) return;
      this.records.set(response.data.data);
      this.pagination.set(response.data.meta);
      this.parents.set(parents);
    });
  }

  protected parentId(record: CatalogRecord): number | null {
    return 'tax_class_id' in record ? record.tax_class_id : 'super_category_id' in record ? record.super_category_id : null;
  }

  protected parentName(record: CatalogRecord): string {
    const id = this.parentId(record);
    return this.parents().find(parent => parent.id === id)?.name ?? this.text.missing;
  }

  protected percentage(record: CatalogRecord): string { return 'percentage' in record ? record.percentage : ''; }
  protected description(record: CatalogRecord): string { return 'description' in record ? record.description ?? '' : ''; }

  protected async openEditor(record?: CatalogRecord): Promise<void> {
    if (this.busy()) return;
    this.notice.set('');
    this.selected.set(record ?? null);
    this.ready.set(false);
    this.form.reset();
    this.editor.open();
    await this.request(this.editorState, async token => {
      const [response, parents] = await Promise.all([
        record ? this.api.getCatalogRecord(this.kind, record.id) : Promise.resolve(null), this.loadParents(),
      ]);
      if (this.session.token !== token) return;
      const fresh = response?.data.data ?? null;
      this.selected.set(fresh);
      this.parents.set(parents);
      this.form.reset({ name: fresh?.name ?? '', percentage: fresh ? this.percentage(fresh) : '',
        parent: fresh ? String(this.parentId(fresh) ?? '') : '', description: fresh ? this.description(fresh) : '',
      });
      this.ready.set(true);
    });
  }

  protected async save(): Promise<void> {
    if (this.busy() || !this.ready()) return;
    if (this.kind !== 'tax-classes' && !this.parents().some(parent => parent.id === Number(this.form.controls.parent.value))) {
      this.form.controls.parent.setErrors({ unavailable: true });
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const name = value.name.trim();
    const payload: CatalogPayloads[CatalogKind] = this.kind === 'tax-classes' ? { name, percentage: value.percentage }
      : this.kind === 'super-categories' ? { name, tax_class_id: Number(value.parent) }
      : { name, super_category_id: Number(value.parent), description: value.description.trim() || null };
    const selected = this.selected();
    let saved = false;
    await this.request(this.editorState, async token => {
      if (selected) await this.api.updateCatalog(this.kind, selected.id, payload);
      else await this.api.createCatalog(this.kind, payload);
      if (this.session.token !== token) return;
      this.notice.set(selected ? this.text.updated : this.text.created);
      this.editor.close();
      saved = true;
    });
    if (saved) {
      await this.loadPage(this.pagination().current_page);
      this.addButton.nativeElement.focus();
    }
  }

  protected prepareDelete(record: CatalogRecord): void {
    if (this.busy()) return;
    this.selected.set(record);
    this.notice.set('');
    this.deleteState.error.set(null);
    this.confirmation.open();
  }

  protected async remove(): Promise<void> {
    const record = this.selected();
    if (this.busy() || !record) return;
    let removed = false;
    await this.request(this.deleteState, async token => {
      await this.api.deleteCatalog(this.kind, record.id);
      if (this.session.token !== token) return;
      this.confirmation.close();
      this.notice.set(this.text.deleted);
      removed = true;
    });
    if (removed) {
      await this.loadPage(this.pagination().current_page);
      this.addButton.nativeElement.focus();
    }
  }

  private async loadParents(): Promise<CatalogRecord[]> {
    if (this.kind === 'tax-classes') return [];
    const kind = this.kind === 'super-categories' ? 'tax-classes' : 'super-categories';
    const records: CatalogRecord[] = [];
    let page = 1;
    let last = 1;
    do {
      const { data } = await this.api.getCatalog(kind, page);
      records.push(...data.data);
      last = data.meta.last_page;
      page++;
    } while (page <= last);
    return records;
  }

  private async request(state: ApiFormState, work: (token: string | null) => Promise<void>): Promise<void> {
    const token = this.session.token;
    await state.run(() => work(token));
    if ([401, 403].includes(state.error()?.status ?? 0) && (this.session.token === token || this.session.token === null)) {
      this.session.clear();
      await this.router.navigate(['/login']);
    }
  }
}
