import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import axios from 'axios';
import { ApiService } from '../../services/api.service';
import { Order, Quote } from '../../services/api.models';
import { SessionService } from '../../services/session.service';

type Failure = 'forbidden' | 'expired' | 'orders' | 'quote';

const labels = {
  es: {
    orders: 'Órdenes confirmadas',
    empty: 'No hay órdenes confirmadas en esta página.', refresh: 'Actualizar',
    previous: 'Anterior', next: 'Siguiente', page: 'Página', order: 'Orden', table: 'Mesa',
    dine_in: 'Comer aquí', takeout: 'Para llevar', delivery: 'Servicio a domicilio',
    generate: 'Generar precuenta', prebill: 'Precuenta', subtotal: 'Subtotal',
    discounts: 'Descuentos aplicados', taxes: 'Impuestos aplicados', shipping: 'Tarifa de envío',
    total: 'Total a pagar', print: 'Imprimir precuenta', backToOrders: 'Volver a órdenes',
    working: 'Cargando…',
    forbidden: 'Este acceso está reservado para cuentas activas de mesero.',
    expired: 'La sesión expiró. Vuelve a iniciar sesión.',
    ordersError: 'No se pudieron cargar las órdenes. Inténtalo de nuevo.',
    quoteError: 'No se pudo generar la precuenta. Verifica que la orden siga confirmada y la caja esté abierta.',
  },
  en: {
    orders: 'Confirmed orders',
    empty: 'There are no confirmed orders on this page.', refresh: 'Refresh',
    previous: 'Previous', next: 'Next', page: 'Page', order: 'Order', table: 'Table',
    dine_in: 'Dine in', takeout: 'Takeout', delivery: 'Delivery',
    generate: 'Generate pre-bill', prebill: 'Pre-bill', subtotal: 'Subtotal',
    discounts: 'Discounts applied', taxes: 'Taxes applied', shipping: 'Delivery fee',
    total: 'Total due', print: 'Print pre-bill', backToOrders: 'Back to orders',
    working: 'Loading…',
    forbidden: 'This area is for active waiter accounts.',
    expired: 'Your session has expired. Sign in again.',
    ordersError: 'Unable to load orders. Try again.',
    quoteError: 'Unable to generate the pre-bill. Check that the order is still confirmed and the register is open.',
  },
};

@Component({
  selector: 'app-prebill',
  standalone: false,
  templateUrl: './prebill.component.html',
  styleUrl: './prebill.component.scss',
})
export class PrebillComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly session = toSignal(this.sessionService.session$);
  protected readonly restaurantName = computed(() => this.session()?.user.employee?.restaurant?.name ?? 'Delishio');
  protected readonly language = computed(() => this.session()?.user.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => labels[this.language()]);
  protected readonly busy = signal(false);
  protected readonly failure = signal<Failure | null>(null);
  protected readonly error = computed(() => {
    const t = this.t();
    const messages = {
      forbidden: t.forbidden, expired: t.expired,
      orders: t.ordersError, quote: t.quoteError,
    };
    const failure = this.failure();
    return failure === null ? '' : messages[failure];
  });
  protected readonly orders = signal<Order[]>([]);
  protected readonly page = signal(1);
  protected readonly lastPage = signal(1);
  protected readonly receipt = signal<{ order: Order; quote: Quote } | null>(null);

  ngOnInit(): void {
    void this.showPage(1);
  }

  protected async showPage(page: number): Promise<void> {
    await this.run('orders', () => this.loadPage(page));
  }

  protected async generate(order: Order): Promise<void> {
    if (order.status !== 'sent') return;
    await this.run('quote', async () => {
      const { data: { data: quote } } = await this.api.getCheckoutPreview(order.id);
      this.receipt.set({ order, quote });
    });
  }

  protected backToOrders(): void {
    this.receipt.set(null);
    void this.showPage(this.page());
  }

  protected print(): void {
    if (this.receipt() !== null && !this.busy()) window.print();
  }

  protected money(amount: string, currency: Quote['currency']): string {
    return new Intl.NumberFormat(this.language() === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency', currency, currencyDisplay: 'code',
    }).format(Number(amount));
  }

  private async loadPage(page: number): Promise<void> {
    const { data: result } = await this.api.getWaiterOrders(page);
    this.orders.set(result.data.filter(order => order.status === 'sent'));
    this.page.set(result.meta.current_page);
    this.lastPage.set(result.meta.last_page);
  }

  private clearSession(): void {
    this.sessionService.clear();
    this.orders.set([]);
    this.receipt.set(null);
    this.page.set(1);
    this.lastPage.set(1);
  }

  private handleFailure(error: unknown, fallback: Failure): void {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      this.clearSession();
      this.failure.set('expired');
      void this.router.navigate(['/login']);
    } else if (axios.isAxiosError(error) && error.response?.status === 403) {
      this.clearSession();
      this.failure.set('forbidden');
      void this.router.navigate(['/login']);
    } else {
      this.failure.set(fallback);
    }
  }

  private async run(fallback: Failure, work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failure.set(null);
    try {
      await work();
    } catch (error) {
      this.handleFailure(error, fallback);
    } finally {
      this.busy.set(false);
    }
  }
}
