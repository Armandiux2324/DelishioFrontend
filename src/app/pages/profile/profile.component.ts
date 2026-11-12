import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';
import { ApiFormState } from '../../shared/forms/api-form-state';
import { accountCopy } from '../auth/account-copy';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  protected readonly session = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly builder = inject(NonNullableFormBuilder);
  private readonly current = toSignal(this.session.session$);
  protected readonly language = computed(() => this.current()?.user.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => accountCopy[this.language()]);
  protected readonly state = new ApiFormState(() => this.language());
  protected readonly securityState = new ApiFormState(() => this.language());
  protected readonly superAdmin = this.session.user?.user_type === 'super_admin';
  protected readonly form = this.builder.group({
    name: [this.session.user?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    username: [this.session.user?.username ?? '', [Validators.maxLength(50), Validators.pattern(/^[a-z0-9_-]*$/)]],
    locale: this.builder.control<'en' | 'es'>(this.session.user?.locale ?? 'es', Validators.required),
    phone: [this.session.user?.employee?.phone ?? this.session.user?.customer?.phone ?? '', Validators.maxLength(20)],
  });
  protected readonly security = this.builder.group({
    enabled: [Boolean(this.session.user?.two_factor_enabled)],
    password: ['', Validators.required],
  });
  protected readonly twoFactorEnabled = computed(() => this.superAdmin || Boolean(this.current()?.user.two_factor_enabled));

  protected async save(): Promise<void> {
    if (this.state.busy() || this.securityState.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    await this.protectedRequest(this.state, async () => {
      const value = this.form.getRawValue();
      const token = this.session.token!;
      const { data: user } = await this.api.updateProfile({
        name: value.name.trim(), username: value.username || null, locale: value.locale,
        ...(this.superAdmin ? {} : { phone: value.phone || null }),
      });
      if (this.session.token !== token) return;
      this.session.start({ access_token: token, user });
      this.state.success.set(this.t().profileSaved);
    });
  }

  protected async changeTwoFactor(): Promise<void> {
    if (this.superAdmin || this.state.busy() || this.securityState.busy()) return;
    if (this.security.invalid) { this.security.markAllAsTouched(); return; }
    const value = this.security.getRawValue();
    if (value.enabled === this.twoFactorEnabled()) return;
    await this.protectedRequest(this.securityState, async () => {
      try {
        const token = this.session.token!;
        const { data: result } = await this.api.setTwoFactor(value.enabled, value.password);
        if (this.session.token !== token) return;
        const user = { ...this.session.user!, two_factor_enabled: value.enabled };
        this.session.start({ access_token: token, user });
        this.security.controls.enabled.setValue(Boolean(user.two_factor_enabled));
        this.securityState.success.set(result.message);
      } finally {
        this.security.controls.password.reset();
      }
    });
  }

  private async protectedRequest(state: ApiFormState, work: () => Promise<void>): Promise<void> {
    const token = this.session.token;
    await state.run(work);
    if ([401, 403].includes(state.error()?.status ?? 0) && (this.session.token === token || this.session.token === null)) {
      this.session.clear();
      await this.router.navigate(['/login']);
    }
  }
}
