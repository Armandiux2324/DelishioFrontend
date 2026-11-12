import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';
import { ApiFormState, matchingPasswords } from '../../../shared/forms/api-form-state';
import { accountCopy } from '../account-copy';

@Component({
  selector: 'app-reset-password',
  standalone: false,
  templateUrl: './reset-password.component.html',
  styleUrl: '../account-form.scss',
})
export class ResetPasswordComponent {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly navigation = (inject(Location).getState() ?? {}) as { email?: string; locale?: string; notice?: string };
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly language = signal<'es' | 'en'>(this.navigation.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => accountCopy[this.language()]);
  protected readonly notice = this.navigation.notice ?? '';
  protected readonly state = new ApiFormState(() => this.language());
  protected readonly completed = signal(false);
  protected readonly form = this.builder.group({
    email: [this.navigation.email ?? '', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  }, { validators: matchingPasswords });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    await this.state.run(async () => {
      try {
        const { data } = await this.api.resetPassword({ ...value, email: value.email.trim() }, this.language());
        if (!this.session.user || this.session.user.email === value.email.trim()) this.session.clear();
        this.completed.set(true);
        this.state.success.set(data.message);
        this.form.controls.code.reset();
      } finally {
        this.form.controls.password.reset();
        this.form.controls.password_confirmation.reset();
      }
    });
  }
}
