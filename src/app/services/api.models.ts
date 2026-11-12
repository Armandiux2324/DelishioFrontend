export type Role = 'super_admin' | 'admin' | 'waiter' | 'chef' | 'customer';

export interface User {
  id: number;
  name: string;
  user_type: 'super_admin' | 'employee' | 'customer';
  locale: 'en' | 'es';
  employee?: { role: 'admin' | 'waiter' | 'chef'; restaurant?: { name: string } };
}
export interface Session { access_token: string; user: User }
export type LoginResult = Session | { requires_2fa: true; ticket: string };

export interface Order {
  id: number;
  status: 'open' | 'sent' | 'closed' | 'cancelled';
  service_type: 'dine_in' | 'takeout' | 'delivery';
  table_number: string | null;
  delivery_fee: string | null;
}
export interface OrdersPage {
  data: Order[];
  meta: { current_page: number; last_page: number };
}
export interface Quote {
  currency: 'MXN' | 'USD';
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
}
