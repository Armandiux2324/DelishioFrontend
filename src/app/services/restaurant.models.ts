export interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  schedule: string | null;
  currency: 'USD' | 'MXN';
  status: 'active' | 'suspended';
  stripe_account_id?: string | null;
  created_at: string | null;
}

export interface RestaurantPage {
  data: Restaurant[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface CreateRestaurantPayload {
  name: string;
  address: string;
  phone: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_password_confirmation: string;
}

export interface UpdateRestaurantPayload {
  name: string;
  address: string;
  phone: string;
  logo_url: string | null;
  stripe_account_id: string | null;
}
