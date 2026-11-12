import { FormControl, FormGroup } from '@angular/forms';
import { ApiFormState, matchingPasswords } from './api-form-state';

describe('ApiFormState', () => {
  it('prevents concurrent submissions and allows retry after a failed request', async () => {
    const state = new ApiFormState(() => 'es');
    let fail!: (reason: unknown) => void;
    const first = state.run(() => new Promise((_resolve, reject) => fail = reject));
    const duplicate = jasmine.createSpy('duplicate');
    await state.run(duplicate);
    expect(duplicate).not.toHaveBeenCalled();
    fail(new Error('offline'));
    await first;
    expect(state.error()?.message).toContain('No se pudo completar');
    expect(state.busy()).toBeFalse();
    await state.run(async () => state.success.set('ok'));
    expect(state.error()).toBeNull();
    expect(state.success()).toBe('ok');
  });

  it('keeps server field errors as text and ignores malformed field values', async () => {
    const state = new ApiFormState(() => 'en');
    await state.run(async () => {
      throw { isAxiosError: true, response: { status: 422, data: {
        message: 'Invalid', errors: { email: ['Already used', 42], name: null },
      } } };
    });
    expect(state.error()?.fields).toEqual({ email: ['Already used'] });
  });

  it('validates password confirmation without accepting an empty required value', () => {
    const form = new FormGroup({
      password: new FormControl('password1'), password_confirmation: new FormControl('password2'),
    }, matchingPasswords);
    expect(form.hasError('passwordMismatch')).toBeTrue();
    form.controls.password_confirmation.setValue('password1');
    expect(form.valid).toBeTrue();
  });
});
