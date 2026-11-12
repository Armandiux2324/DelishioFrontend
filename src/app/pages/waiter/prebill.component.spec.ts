import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AxiosResponse } from 'axios';
import { ApiService } from '../../services/api.service';
import { SessionService } from '../../services/session.service';
import { WaiterModule } from './waiter.module';
import { PrebillComponent } from './prebill.component';

const user = {
  id: 1, name: 'Mesero', user_type: 'employee' as const, locale: 'es' as const,
  employee: { role: 'waiter' as const, restaurant: { name: 'Delishio Demo' } },
};
const delivery = {
  id: 42, status: 'sent', service_type: 'delivery', table_number: null, delivery_fee: '5.00',
};
const quote = {
  currency: 'MXN', subtotal: '100.00', discount_total: '10.00', tax_total: '9.00', total: '104.00',
};
const response = (data: unknown) => ({ data }) as AxiosResponse;

describe('PrebillComponent with NgModules and shared API', () => {
  let fixture: ComponentFixture<PrebillComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let session: SessionService;
  let view: HTMLElement;

  beforeEach(() => {
    sessionStorage.removeItem('delishio.access_token');
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getWaiterOrders', 'getCheckoutPreview']);
    api.getWaiterOrders.and.resolveTo(response({
      data: [delivery, { ...delivery, id: 43, status: 'closed' }, { ...delivery, id: 44, status: 'open' }],
      meta: { current_page: 1, last_page: 1 },
    }));
    api.getCheckoutPreview.and.resolveTo(response({ data: quote }));
    TestBed.configureTestingModule({
      imports: [WaiterModule],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    });
    session = TestBed.inject(SessionService);
    session.start({ access_token: 'test-token', user });
    fixture = TestBed.createComponent(PrebillComponent);
    view = fixture.nativeElement;
  });

  afterEach(() => session.clear());

  function render(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function click(text: string): void {
    const button = Array.from(view.querySelectorAll('button')).find(item => item.textContent?.trim() === text);
    expect(button).withContext(text).toBeDefined();
    expect(button?.disabled).withContext(text).toBeFalse();
    button?.click();
    render();
  }

  it('prints backend totals for a delivery order and only lists confirmed orders', fakeAsync(() => {
    render();
    expect(api.getWaiterOrders).toHaveBeenCalledOnceWith(1);
    expect(view.querySelectorAll('.orders li').length).toBe(1);
    click('Generar precuenta');
    expect(api.getCheckoutPreview).toHaveBeenCalledOnceWith(42);
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
  }));

  it('loads the next page and omits the delivery fee for takeout in English and USD', fakeAsync(() => {
    session.start({ access_token: 'test-token', user: { ...user, locale: 'en' } });
    api.getWaiterOrders.and.resolveTo(response({ data: [], meta: { current_page: 1, last_page: 2 } }));
    render();
    api.getWaiterOrders.and.resolveTo(response({
      data: [{ ...delivery, id: 50, service_type: 'takeout', delivery_fee: null }],
      meta: { current_page: 2, last_page: 2 },
    }));
    click('Next');
    expect(api.getWaiterOrders).toHaveBeenCalledWith(2);
    api.getCheckoutPreview.and.resolveTo(response({ data: { ...quote, currency: 'USD', total: '99.00' } }));
    click('Generate pre-bill');
    expect(view.querySelector('.receipt')?.textContent).toContain('Takeout');
    expect(view.querySelector('.receipt')?.textContent).not.toContain('Delivery fee');
    expect(view.querySelector('.total')?.textContent).toContain('99.00');
    expect(view.querySelector('.total')?.textContent).toContain('USD');
  }));

  it('keeps printing unavailable after a rejected preview', fakeAsync(() => {
    api.getCheckoutPreview.and.rejectWith({ isAxiosError: true, response: { status: 409 } });
    render();
    click('Generar precuenta');
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('No se pudo generar la precuenta');
    expect(view.querySelector('.receipt')).toBeNull();
    expect(view.textContent).not.toContain('Imprimir precuenta');
  }));

  it('clears the receipt and returns to login when the token expires', fakeAsync(() => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    render();
    click('Generar precuenta');
    api.getWaiterOrders.and.rejectWith({ isAxiosError: true, response: { status: 401 } });
    click('Volver a órdenes');
    expect(session.token).toBeNull();
    expect(view.querySelector('.receipt')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('reports a failed order query and can retry', fakeAsync(() => {
    api.getWaiterOrders.and.rejectWith(new Error('offline'));
    render();
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar las órdenes');
    api.getWaiterOrders.and.resolveTo(response({ data: [delivery], meta: { current_page: 1, last_page: 1 } }));
    click('Actualizar');
    expect(view.querySelector('[role="alert"]')).toBeNull();
    expect(view.querySelector('.orders')?.textContent).toContain('#42');
  }));
});
