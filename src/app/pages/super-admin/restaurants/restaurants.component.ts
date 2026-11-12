import { Component, ElementRef, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { NonNullableFormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Restaurant } from '../../../services/restaurant.models';
import { SessionService } from '../../../services/session.service';
import { DialogComponent } from '../../../shared/dialog/dialog.component';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { restaurantCopy } from './restaurant-copy';

type RestaurantAction = 'activate' | 'suspend' | 'delete';

const matchingAdminPasswords: ValidatorFn = form => {
  const confirmation = form.get('admin_password_confirmation')?.value;
  return confirmation && confirmation !== form.get('admin_password')?.value
    ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-restaurants',
  standalone: false,
  templateUrl: './restaurants.component.html',
  styleUrl: './restaurants.component.scss',
})
export class RestaurantsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly locale = this.session.user?.locale === 'en' ? 'en' : 'es';
  protected readonly text = restaurantCopy[this.locale];
  protected readonly listState = new ApiFormState(() => this.locale);
  protected readonly detailState = new ApiFormState(() => this.locale);
  protected readonly formState = new ApiFormState(() => this.locale);
  protected readonly actionState = new ApiFormState(() => this.locale);
  protected readonly busy = computed(() => this.listState.busy() || this.detailState.busy() || this.formState.busy() || this.actionState.busy());
  protected readonly restaurants = signal<Restaurant[]>([]);
  protected readonly pagination = signal({ current_page: 1, last_page: 1, total: 0 });
  protected readonly selected = signal<Restaurant | null>(null);
  protected readonly editing = signal(false);
  protected readonly action = signal<RestaurantAction>('suspend');
  protected readonly notice = signal('');
  protected readonly form = this.builder.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.maxLength(20)]],
    admin_name: ['', [Validators.required, Validators.maxLength(255)]],
    admin_email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    admin_password: ['', [Validators.required, Validators.minLength(8)]],
    admin_password_confirmation: ['', Validators.required],
    logo_url: ['', Validators.maxLength(255)],
    stripe_account_id: ['', [Validators.maxLength(255), Validators.pattern(/^acct_[a-zA-Z0-9]+$/)]],
  }, { validators: matchingAdminPasswords });
  @ViewChild('details', { static: true }) protected details!: DialogComponent;
  @ViewChild('editor', { static: true }) protected editor!: DialogComponent;
  @ViewChild('confirmation', { static: true }) protected confirmation!: DialogComponent;
  @ViewChild('newRestaurant', { static: true }) private newRestaurant!: ElementRef<HTMLButtonElement>;

  ngOnInit(): void {
    void this.loadPage(1);
  }

  protected async loadPage(page: number): Promise<void> {
    if (!Number.isSafeInteger(page) || page < 1 || this.busy()) return;
    await this.run(this.listState, async token => {
      let response = await this.api.getRestaurants(page);
      if (response.data.meta.current_page > response.data.meta.last_page) {
        response = await this.api.getRestaurants(response.data.meta.last_page);
      }
      if (this.session.token !== token) return;
      this.restaurants.set(response.data.data);
      this.pagination.set(response.data.meta);
    });
  }

  protected async showDetails(restaurant: Restaurant): Promise<void> {
    if (this.busy()) return;
    this.selected.set(null);
    this.details.open();
    await this.run(this.detailState, async token => {
      const { data } = await this.api.getRestaurant(restaurant.id);
      if (this.session.token === token) this.selected.set(data.data);
    });
  }

  protected openEditor(restaurant?: Restaurant): void {
    if (this.busy()) return;
    this.editing.set(restaurant !== undefined);
    this.notice.set('');
    this.selected.set(restaurant ?? null);
    this.formState.error.set(null);
    this.formState.success.set('');
    this.form.reset({
      name: restaurant?.name ?? '', address: restaurant?.address ?? '', phone: restaurant?.phone ?? '',
      admin_name: '', admin_email: '', admin_password: '', admin_password_confirmation: '',
      logo_url: restaurant?.logo_url ?? '', stripe_account_id: restaurant?.stripe_account_id ?? '',
    });
    for (const name of ['admin_name', 'admin_email', 'admin_password', 'admin_password_confirmation'] as const) {
      if (restaurant) this.form.controls[name].disable();
      else this.form.controls[name].enable();
    }
    for (const name of ['logo_url', 'stripe_account_id'] as const) {
      if (restaurant) this.form.controls[name].enable();
      else this.form.controls[name].disable();
    }
    this.editor.open();
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const restaurant = this.selected();
    let saved = false;
    await this.run(this.formState, async token => {
      try {
        const general = { name: value.name.trim(), address: value.address.trim(), phone: value.phone.trim() };
        const response = this.editing() && restaurant
          ? await this.api.updateRestaurant(restaurant.id, {
              ...general, logo_url: value.logo_url || null, stripe_account_id: value.stripe_account_id || null,
            })
          : await this.api.createRestaurant({
              ...general, admin_name: value.admin_name.trim(), admin_email: value.admin_email.trim().toLowerCase(),
              admin_password: value.admin_password, admin_password_confirmation: value.admin_password_confirmation,
            });
        if (this.session.token !== token) return;
        this.selected.set(response.data.data);
        this.notice.set(this.editing() ? this.text.updated : this.text.created);
        this.editor.close();
        saved = true;
      } finally {
        this.clearPasswords();
      }
    });
    if (saved) await this.loadPage(this.pagination().current_page);
  }

  protected prepareAction(action: RestaurantAction): void {
    if (this.busy() || !this.selected()) return;
    this.action.set(action);
    this.notice.set('');
    this.actionState.error.set(null);
    this.confirmation.open();
  }

  protected async confirmAction(): Promise<void> {
    const restaurant = this.selected();
    if (!restaurant || this.busy()) return;
    const action = this.action();
    let completed = false;
    await this.run(this.actionState, async token => {
      if (action === 'delete') {
        await this.api.deleteRestaurant(restaurant.id);
        if (this.session.token !== token) return;
        this.selected.set(null);
        this.details.close();
        this.notice.set(this.text.deleted);
      } else {
        const { data } = action === 'activate'
          ? await this.api.activateRestaurant(restaurant.id)
          : await this.api.suspendRestaurant(restaurant.id);
        if (this.session.token !== token) return;
        this.selected.set(data.data);
        this.notice.set(action === 'activate' ? this.text.activated : this.text.suspendedNotice);
      }
      this.confirmation.close();
      completed = true;
    });
    if (completed) {
      await this.loadPage(this.pagination().current_page);
      if (action === 'delete' && this.session.token) this.newRestaurant.nativeElement.focus();
    }
  }

  protected actionTitle(): string {
    return { activate: this.text.activateQuestion, suspend: this.text.suspendQuestion, delete: this.text.deleteQuestion }[this.action()];
  }

  protected actionHint(): string {
    return { activate: this.text.activateHint, suspend: this.text.suspendHint, delete: this.text.deleteHint }[this.action()];
  }

  protected clearPasswords(): void {
    this.form.controls.admin_password.reset();
    this.form.controls.admin_password_confirmation.reset();
  }

  protected createdAt(value: string | null): string {
    return value === null ? this.text.missing : new Intl.DateTimeFormat(this.locale, {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(value));
  }

  private async run(state: ApiFormState, work: (token: string | null) => Promise<void>): Promise<void> {
    const token = this.session.token;
    await state.run(() => work(token));
    if ([401, 403].includes(state.error()?.status ?? 0) && (this.session.token === token || this.session.token === null)) {
      this.session.clear();
      await this.router.navigate(['/login']);
    }
  }
}
