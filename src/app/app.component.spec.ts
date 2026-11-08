import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Delishio', () => {
  it('opens the waiter sign-in from the home route', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/mesero');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Acceso del mesero');
  });
});
