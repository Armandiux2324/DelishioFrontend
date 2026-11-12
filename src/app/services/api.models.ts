export type Role = 'super_admin' | 'admin' | 'waiter' | 'chef' | 'customer';

export interface User {
  id: number;
  name: string;
  user_type: 'super_admin' | 'employee' | 'customer';
  locale: 'en' | 'es';
  email?: string;
  username?: string | null;
  two_factor_enabled?: boolean;
  customer?: { phone: string | null };
  employee?: { role: 'admin' | 'waiter' | 'chef'; phone?: string | null; restaurant?: { name: string } };
}
export interface RegisterPayload {
  name: string;
  username: string | null;
  email: string;
  phone: string;
  locale: 'en' | 'es';
  password: string;
  password_confirmation: string;
}
export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}
export interface ProfilePayload {
  name: string;
  username: string | null;
  locale: 'en' | 'es';
  phone?: string | null;
}
export interface ApiMessage { message: string }
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
