import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { accountCopy } from '../account-copy';

@Component({
  selector: 'app-verify-email',
  standalone: false,
  templateUrl: './verify-email.component.html',
  styleUrl: '../account-form.scss',
})
export class VerifyEmailComponent {
  private readonly api = inject(ApiService);
  private readonly navigation = (inject(Location).getState() ?? {}) as { email?: string; locale?: string };
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly language = signal<'es' | 'en'>(this.navigation.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => accountCopy[this.language()]);
  protected readonly state = new ApiFormState(() => this.language());
  protected readonly verified = signal(false);
  protected readonly form = this.builder.group({
    email: [this.navigation.email ?? '', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    await this.state.run(async () => {
      const { email, code } = this.form.getRawValue();
      const { data } = await this.api.verifyEmail(email.trim(), code, this.language());
      this.verified.set(true);
      this.state.success.set(data.message);
      this.form.controls.code.reset();
    });
  }

  protected async resend(): Promise<void> {
    if (this.form.controls.email.invalid) { this.form.controls.email.markAsTouched(); return; }
    await this.state.run(async () => {
      const { data } = await this.api.resendVerification(this.form.controls.email.value.trim(), this.language());
      this.state.success.set(data.message);
      this.form.controls.code.reset();
    });
  }
}
