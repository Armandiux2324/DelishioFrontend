import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { accountCopy } from '../account-copy';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.component.html',
  styleUrl: '../account-form.scss',
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly navigation = (inject(Location).getState() ?? {}) as { email?: string; locale?: string };
  private readonly builder = inject(NonNullableFormBuilder);
  protected readonly language = signal<'es' | 'en'>(this.navigation.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => accountCopy[this.language()]);
  protected readonly state = new ApiFormState(() => this.language());
  protected readonly form = this.builder.group({
    email: [this.navigation.email ?? '', [Validators.required, Validators.email]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    await this.state.run(async () => {
      const email = this.form.controls.email.value.trim();
      const { data } = await this.api.forgotPassword(email, this.language());
      await this.router.navigate(['/reset-password'], {
        state: { email, locale: this.language(), notice: data.message },
      });
    });
  }
}
