import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ApiFormState, matchingPasswords } from '../../../shared/forms/api-form-state';
import { accountCopy } from '../account-copy';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: '../account-form.scss',
})
export class RegisterComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly builder = inject(NonNullableFormBuilder);
  private readonly navigation = (inject(Location).getState() ?? {}) as { locale?: string };
  protected readonly language = signal<'es' | 'en'>(this.navigation.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => accountCopy[this.language()]);
  protected readonly state = new ApiFormState(() => this.language());
  protected readonly form = this.builder.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    username: ['', [Validators.maxLength(50), Validators.pattern(/^[a-z0-9_-]*$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.maxLength(20)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  }, { validators: matchingPasswords });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    await this.state.run(async () => {
      try {
        await this.api.register({
          ...value, name: value.name.trim(), username: value.username || null,
          email: value.email.trim().toLowerCase(), locale: this.language(),
        });
        await this.router.navigate(['/verify-email'], { state: { email: value.email.trim().toLowerCase(), locale: this.language() } });
      } finally {
        this.form.controls.password.reset();
        this.form.controls.password_confirmation.reset();
      }
    });
  }
}
