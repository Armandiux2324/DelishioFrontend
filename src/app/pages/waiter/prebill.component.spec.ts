import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { PrebillComponent } from './prebill.component';

const ordersUrl = '/api/v1/waiter/orders';
const session = {
  access_token: 'test-token',
  user: { locale: 'es', employee: { role: 'waiter', restaurant: { name: 'Delishio Demo' } } },
};
const delivery = { id: 42, status: 'sent', service_type: 'delivery', table_number: null, delivery_fee: '5.00' };
const quote = {
  currency: 'MXN', subtotal: '100.00', discount_total: '10.00', tax_total: '9.00', total: '104.00',
};

describe('PrebillComponent', () => {
  let fixture: ComponentFixture<PrebillComponent>;
  let http: HttpTestingController;
  let view: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PrebillComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrebillComponent);
    view = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function setInput(name: string, value: string): void {
    const input = view.querySelector<HTMLInputElement>('input[name="' + name + '"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function click(text: string): void {
    const button = Array.from(view.querySelectorAll('button')).find(item => item.textContent?.trim() === text);
    expect(button).withContext(text).toBeDefined();
    expect(button?.disabled).withContext(text).toBeFalse();
    button?.click();
    fixture.detectChanges();
  }

  function login() {
    tick();
    setInput('login', 'mesero');
    setInput('password', 'contraseña');
    fixture.detectChanges();
    click('Iniciar sesión');
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ login: 'mesero', password: 'contraseña' });
    return request;
  }

  function render(): void {
    tick();
    fixture.detectChanges();
  }

  function respondOrders(data: unknown[], page = 1, lastPage = 1): void {
    const request = http.expectOne(ordersUrl + '?page=' + page);
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ data, meta: { current_page: page, last_page: lastPage } });
    render();
  }

  it('prints the backend totals for a delivery order and only lists confirmed orders', fakeAsync(() => {
    login().flush(session);
    render();
    respondOrders([delivery, { ...delivery, id: 43, status: 'closed' }, { ...delivery, id: 44, status: 'open' }]);
    expect(view.querySelectorAll('.orders li').length).toBe(1);
    expect(view.querySelector('.orders')?.textContent).toContain('#42');
    click('Generar precuenta');

    const request = http.expectOne(ordersUrl + '/42/checkout-preview');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(request.request.body).toEqual({ payments: [] });
    request.flush({ data: quote });
    render();

    const receipt = view.querySelector('.receipt')!;
    expect(receipt.textContent).toContain('Delishio Demo');
    expect(Array.from(receipt.querySelectorAll('dt'), cell => cell.textContent)).toEqual([
      'Subtotal', 'Descuentos aplicados', 'Impuestos aplicados', 'Tarifa de envío', 'Total a pagar',
    ]);
    const format = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', currencyDisplay: 'code' });
    expect(Array.from(receipt.querySelectorAll('dd'), cell => cell.textContent)).toEqual(
      [100, 10, 9, 5, 104].map(amount => format.format(amount)),
    );
    const print = spyOn(window, 'print');
    click('Imprimir precuenta');
    expect(print).toHaveBeenCalledTimes(1);
    http.expectNone(ordersUrl + '/42/close');
  }));

  it('loads the next page and omits the delivery fee for takeout', fakeAsync(() => {
    login().flush({ ...session, user: { ...session.user, locale: 'en' } });
    render();
    respondOrders([], 1, 2);
    click('Next');
    respondOrders([{ ...delivery, id: 50, service_type: 'takeout', delivery_fee: null }], 2, 2);
    click('Generate pre-bill');
    http.expectOne(ordersUrl + '/50/checkout-preview').flush({ data: { ...quote, currency: 'USD', total: '99.00' } });
    render();
    expect(view.querySelector('.receipt')?.textContent).toContain('Takeout');
    expect(view.querySelector('.receipt')?.textContent).not.toContain('Delivery fee');
    expect(view.querySelector('.total')?.textContent).toContain('99.00');
    expect(view.querySelector('.total')?.textContent).toContain('USD');
  }));

  it('waits for the OTP before listing orders', fakeAsync(() => {
    login().flush({ requires_2fa: true, ticket: 'test-ticket' });
    render();
    http.expectNone(request => request.url === ordersUrl);
    setInput('code', '012345');
    fixture.detectChanges();
    click('Verificar código');
    const request = http.expectOne('/api/v1/auth/login/verify-2fa');
    expect(request.request.body).toEqual({ ticket: 'test-ticket', code: '012345' });
    request.flush(session);
    render();
    respondOrders([]);
    expect(view.querySelector('#orders-title')).not.toBeNull();
  }));

  it('keeps printing unavailable after a rejected preview', fakeAsync(() => {
    login().flush(session);
    render();
    respondOrders([delivery]);
    click('Generar precuenta');
    http.expectOne(ordersUrl + '/42/checkout-preview').flush({}, { status: 409, statusText: 'Conflict' });
    render();
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('No se pudo generar la precuenta');
    expect(view.querySelector('.receipt')).toBeNull();
    expect(view.textContent).not.toContain('Imprimir precuenta');
  }));

  it('clears the session when the token expires during a preview', fakeAsync(() => {
    login().flush(session);
    render();
    respondOrders([delivery]);
    click('Generar precuenta');
    http.expectOne(ordersUrl + '/42/checkout-preview').flush({}, { status: 401, statusText: 'Unauthorized' });
    render();
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('La sesión expiró');
    expect(view.querySelector('#access-title')).not.toBeNull();
    expect(view.querySelector('.receipt')).toBeNull();
  }));
});
