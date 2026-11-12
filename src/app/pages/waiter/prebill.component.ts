import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface Order {
  id: number;
  status: 'open' | 'sent' | 'closed' | 'cancelled';
  service_type: 'dine_in' | 'takeout' | 'delivery';
  table_number: string | null;
  delivery_fee: string | null;
}

interface OrdersPage {
  data: Order[];
  meta: { current_page: number; last_page: number };
}

interface Quote {
  currency: 'MXN' | 'USD';
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
}

interface Session {
  access_token: string;
  user: { locale: 'en' | 'es'; employee?: { role: string; restaurant?: { name: string } } };
}

type LoginResult = Session | { requires_2fa: true; ticket: string };
type Failure = 'credentials' | 'code' | 'forbidden' | 'expired' | 'orders' | 'quote';

const labels = {
  es: {
    waiter: 'Mesero', access: 'Acceso del mesero', login: 'Usuario o correo', password: 'Contraseña',
    signIn: 'Iniciar sesión', code: 'Código de verificación', verify: 'Verificar código',
    back: 'Volver', signOut: 'Cerrar sesión', orders: 'Órdenes confirmadas',
    empty: 'No hay órdenes confirmadas en esta página.', refresh: 'Actualizar',
    previous: 'Anterior', next: 'Siguiente', page: 'Página', order: 'Orden', table: 'Mesa',
    dine_in: 'Comer aquí', takeout: 'Para llevar', delivery: 'Servicio a domicilio',
    generate: 'Generar precuenta', prebill: 'Precuenta', subtotal: 'Subtotal',
    discounts: 'Descuentos aplicados', taxes: 'Impuestos aplicados', shipping: 'Tarifa de envío',
    total: 'Total a pagar', print: 'Imprimir precuenta', backToOrders: 'Volver a órdenes',
    working: 'Cargando…', credentials: 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
    codeError: 'No se pudo verificar el código. Inténtalo de nuevo o vuelve a iniciar sesión.',
    forbidden: 'Este acceso está reservado para cuentas activas de mesero.',
    expired: 'La sesión expiró. Vuelve a iniciar sesión.',
    ordersError: 'No se pudieron cargar las órdenes. Inténtalo de nuevo.',
    quoteError: 'No se pudo generar la precuenta. Verifica que la orden siga confirmada y la caja esté abierta.',
  },
  en: {
    waiter: 'Waiter', access: 'Waiter sign-in', login: 'Username or email', password: 'Password',
    signIn: 'Sign in', code: 'Verification code', verify: 'Verify code',
    back: 'Back', signOut: 'Sign out', orders: 'Confirmed orders',
    empty: 'There are no confirmed orders on this page.', refresh: 'Refresh',
    previous: 'Previous', next: 'Next', page: 'Page', order: 'Order', table: 'Table',
    dine_in: 'Dine in', takeout: 'Takeout', delivery: 'Delivery',
    generate: 'Generate pre-bill', prebill: 'Pre-bill', subtotal: 'Subtotal',
    discounts: 'Discounts applied', taxes: 'Taxes applied', shipping: 'Delivery fee',
    total: 'Total due', print: 'Print pre-bill', backToOrders: 'Back to orders',
    working: 'Loading…', credentials: 'Unable to sign in. Check your details and try again.',
    codeError: 'Unable to verify the code. Try again or sign in again.',
    forbidden: 'This area is for active waiter accounts.',
    expired: 'Your session has expired. Sign in again.',
    ordersError: 'Unable to load orders. Try again.',
    quoteError: 'Unable to generate the pre-bill. Check that the order is still confirmed and the register is open.',
  },
};

@Component({
  selector: 'app-prebill',
  imports: [FormsModule],
  templateUrl: './prebill.component.html',
  styleUrl: './prebill.component.scss',
})
export class PrebillComponent {
  private readonly http = inject(HttpClient);
  private readonly session = signal<Session | null>(null);
  protected readonly signedIn = computed(() => this.session() !== null);
  protected readonly restaurantName = computed(() => this.session()?.user.employee?.restaurant?.name ?? 'Delishio');
  protected readonly language = computed(() => this.session()?.user.locale === 'en' ? 'en' : 'es');
  protected readonly t = computed(() => labels[this.language()]);
  protected readonly ticket = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failure = signal<Failure | null>(null);
  protected readonly error = computed(() => {
    const t = this.t();
    const messages = {
      credentials: t.credentials, code: t.codeError, forbidden: t.forbidden, expired: t.expired,
      orders: t.ordersError, quote: t.quoteError,
    };
    const failure = this.failure();
    return failure === null ? '' : messages[failure];
  });
  protected readonly orders = signal<Order[]>([]);
  protected readonly page = signal(1);
  protected readonly lastPage = signal(1);
  protected readonly receipt = signal<{ order: Order; quote: Quote } | null>(null);

  protected async signIn(login: string, password: string): Promise<void> {
    await this.run('credentials', async () => {
      const response = await firstValueFrom(this.http.post<LoginResult>('/api/v1/auth/login', { login: login.trim(), password }));
      if ('requires_2fa' in response) {
        this.ticket.set(response.ticket);
      } else {
        await this.startSession(response);
      }
    });
  }

  protected async verify(code: string): Promise<void> {
    const ticket = this.ticket();
    if (ticket === null) return;
    await this.run('code', async () => {
      const session = await firstValueFrom(this.http.post<Session>('/api/v1/auth/login/verify-2fa', { ticket, code }));
      this.ticket.set(null);
      await this.startSession(session);
    });
  }

  protected cancelVerification(): void {
    this.ticket.set(null);
    this.failure.set(null);
  }

  protected async showPage(page: number): Promise<void> {
    await this.run('orders', () => this.loadPage(page));
  }

  protected async generate(order: Order): Promise<void> {
    if (order.status !== 'sent') return;
    await this.run('quote', async () => {
      const { data: quote } = await firstValueFrom(this.http.post<{ data: Quote }>(
        '/api/v1/waiter/orders/' + order.id + '/checkout-preview', { payments: [] }, this.auth(),
      ));
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

  protected async signOut(): Promise<void> {
    await this.run('expired', async () => {
      try {
        await firstValueFrom(this.http.post('/api/v1/auth/logout', {}, this.auth()));
      } finally {
        this.clearSession();
      }
    });
  }

  private async startSession(session: Session): Promise<void> {
    if (session.user.employee?.role !== 'waiter') {
      this.failure.set('forbidden');
      // Discard the token issued to an account that cannot use this view.
      await firstValueFrom(this.http.post('/api/v1/auth/logout', {}, {
        headers: { Authorization: 'Bearer ' + session.access_token },
      })).catch(() => undefined);
      return;
    }
    this.session.set(session);
    try {
      await this.loadPage(1);
    } catch (error) {
      this.handleFailure(error, 'orders');
    }
  }

  private async loadPage(page: number): Promise<void> {
    const result = await firstValueFrom(this.http.get<OrdersPage>('/api/v1/waiter/orders', {
      ...this.auth(), params: { page },
    }));
    this.orders.set(result.data.filter(order => order.status === 'sent'));
    this.page.set(result.meta.current_page);
    this.lastPage.set(result.meta.last_page);
  }

  private auth() {
    return { headers: { Authorization: 'Bearer ' + this.session()?.access_token } };
  }

  private clearSession(): void {
    this.session.set(null);
    this.orders.set([]);
    this.receipt.set(null);
    this.page.set(1);
    this.lastPage.set(1);
  }

  private handleFailure(error: unknown, fallback: Failure): void {
    if (error instanceof HttpErrorResponse && error.status === 401 && this.signedIn()) {
      this.clearSession();
      this.failure.set('expired');
    } else if (error instanceof HttpErrorResponse && error.status === 403) {
      this.clearSession();
      this.ticket.set(null);
      this.failure.set('forbidden');
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
