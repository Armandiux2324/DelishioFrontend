import { signal } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import axios from 'axios';

export interface ApiFormError {
  status: number;
  message: string;
  fields: Record<string, string[]>;
}

export class ApiFormState {
  readonly busy = signal(false);
  readonly error = signal<ApiFormError | null>(null);
  readonly success = signal('');

  constructor(private readonly locale: () => 'en' | 'es') {}

  async run(work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.success.set('');
    try {
      await work();
    } catch (error) {
      const fallback = this.locale() === 'en'
        ? 'Unable to complete the request. Please try again.'
        : 'No se pudo completar la solicitud. Inténtalo de nuevo.';
      const status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      const data: unknown = axios.isAxiosError(error) ? error.response?.data : null;
      const body = data !== null && typeof data === 'object' ? data as Record<string, unknown> : {};
      const fields: Record<string, string[]> = {};
      if (body['errors'] !== null && typeof body['errors'] === 'object') {
        for (const [field, messages] of Object.entries(body['errors'])) {
          if (Array.isArray(messages)) fields[field] = messages.filter((message): message is string => typeof message === 'string');
        }
      }
      const throttled = this.locale() === 'en'
        ? 'Too many attempts. Wait a moment before trying again.'
        : 'Demasiados intentos. Espera un momento antes de intentarlo de nuevo.';
      const message = typeof body['message'] === 'string' ? body['message'] : fallback;
      this.error.set({
        status,
        message: status === 429 ? throttled : message,
        fields,
      });
    } finally {
      this.busy.set(false);
    }
  }
}

export function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;
  return confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}
