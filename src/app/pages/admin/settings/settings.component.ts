import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { RestaurantSettingsValues } from '../../../services/restaurant-settings.models';
import { SessionService } from '../../../services/session.service';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { settingsCopy } from './settings-copy';

const decimal = (places: number, min: number, max: number): ValidatorFn => control => {
  const value = control.value;
  if (value === '') return null;
  const pattern = places === 0 ? /^\d+$/ : new RegExp('^\\d+(?:\\.\\d{1,' + places + '})?$');
  return pattern.test(String(value)) && Number(value) >= min && Number(value) <= max ? null : { decimal: { min, max, places } };
};
const httpUrl: ValidatorFn = control => {
  if (!control.value) return null;
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};
const descriptionBytes: ValidatorFn = control => new TextEncoder().encode(control.value).length <= 65535 ? null : { bytes: true };

@Component({
  selector: 'app-restaurant-settings', standalone: false,
  templateUrl: './settings.component.html', styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly locale = this.session.user?.locale === 'en' ? 'en' : 'es';
  protected readonly text = settingsCopy[this.locale];
  protected readonly loadState = new ApiFormState(() => this.locale);
  protected readonly saveState = new ApiFormState(() => this.locale);
  protected readonly loaded = signal(false);
  protected readonly busy = computed(() => this.loadState.busy() || this.saveState.busy());
  private baseline: RestaurantSettingsValues | null = null;
  protected readonly form = this.builder.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', descriptionBytes], address: ['', Validators.maxLength(255)],
    phone: ['', Validators.maxLength(20)], logo_url: ['', [httpUrl, Validators.maxLength(255)]],
    schedule: ['', Validators.maxLength(255)],
    currency: this.builder.control<'USD' | 'MXN'>('MXN', [Validators.required, Validators.pattern(/^(USD|MXN)$/)]),
    loyalty_enabled: false,
    loyalty_factor: ['', [Validators.required, decimal(4, 0.0001, 9999.9999)]],
    loyalty_redeem_value: ['', [Validators.required, decimal(4, 0.0001, 9999.9999)]],
    discount_limit_per_shift: ['', decimal(2, 0, 999999.99)],
    courtesy_percentage: ['', decimal(2, 0, 100)], courtesy_daily_limit: ['', decimal(0, 0, 4294967295)],
    dual_pricing_enabled: false,
    dual_pricing_percentage: ['', [Validators.required, decimal(2, 0, 100)]],
    timezone: ['', [Validators.required, Validators.maxLength(64)]],
    overtime_weekly_hours: ['', [Validators.required, decimal(2, 0, 168)]],
    overtime_multiplier: ['', [Validators.required, decimal(2, 1, 99.99)]],
  });
  protected readonly groups = [
    { title: 'general', hint: 'generalHint', fields: ['name', 'description', 'address', 'phone', 'logo_url', 'schedule'] },
    { title: 'financial', hint: 'financialHint', fields: ['currency', 'discount_limit_per_shift', 'courtesy_percentage', 'courtesy_daily_limit'] },
    { title: 'loyalty', hint: 'loyaltyHint', fields: ['loyalty_enabled', 'loyalty_factor', 'loyalty_redeem_value'] },
    { title: 'dual', hint: 'dualHint', fields: ['dual_pricing_enabled', 'dual_pricing_percentage'] },
    { title: 'payroll', hint: 'payrollHint', fields: ['timezone', 'overtime_weekly_hours', 'overtime_multiplier'] },
  ] as const;

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    if (this.busy()) return;
    await this.request(this.loadState, async token => {
      const { data } = await this.api.getRestaurantSettings();
      if (this.session.token !== token) return;
      this.populate(data.data);
      this.loaded.set(true);
    });
  }

  protected updateToggles(): void {
    for (const [flag, fields] of [
      ['loyalty_enabled', ['loyalty_factor', 'loyalty_redeem_value']],
      ['dual_pricing_enabled', ['dual_pricing_percentage']],
    ] as const) {
      for (const field of fields) {
        if (this.form.controls[flag].value) this.form.controls[field].enable();
        else this.form.controls[field].disable();
      }
    }
  }

  protected reset(): void {
    if (!this.baseline || this.busy()) return;
    this.populate(this.baseline);
    this.saveState.error.set(null);
    this.saveState.success.set('');
  }

  protected async save(): Promise<void> {
    if (!this.loaded() || this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {};
    for (const key of Object.keys(raw) as (keyof typeof raw)[]) {
      if (this.form.controls[key].disabled) continue;
      const value = raw[key];
      const normalized = typeof value === 'boolean' ? value : value.trim() || null;
      const original = this.baseline![key];
      if (String(normalized ?? '') !== String(original ?? '')) {
        payload[key] = key === 'courtesy_daily_limit' && normalized !== null ? Number(normalized) : normalized;
      }
    }
    if (!Object.keys(payload).length) return;
    await this.request(this.saveState, async token => {
      const { data } = await this.api.updateRestaurantSettings(payload);
      if (this.session.token !== token) return;
      this.populate(data.data);
      const user = this.session.user;
      if (token && user?.employee) {
        this.session.start({ access_token: token, user: { ...user, employee: {
          ...user.employee, restaurant: { ...user.employee.restaurant, name: data.data.name },
        } } });
      }
      this.saveState.success.set(this.text.saved);
    });
  }

  private populate(data: RestaurantSettingsValues): void {
    this.baseline = { ...data };
    const values = Object.fromEntries(Object.keys(this.form.controls).map(key => {
      const value = data[key as keyof RestaurantSettingsValues];
      return [key, typeof value === 'boolean' ? value : String(value ?? '')];
    }));
    this.form.reset(values);
    this.updateToggles();
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
