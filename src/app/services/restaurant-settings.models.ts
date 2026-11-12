export interface RestaurantSettingsValues {
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  schedule: string | null;
  currency: 'USD' | 'MXN';
  loyalty_enabled: boolean;
  loyalty_factor: string | null;
  loyalty_redeem_value: string | null;
  discount_limit_per_shift: string | null;
  courtesy_percentage: string | null;
  courtesy_daily_limit: number | null;
  dual_pricing_enabled: boolean;
  dual_pricing_percentage: string | null;
  timezone: string;
  overtime_weekly_hours: string;
  overtime_multiplier: string;
}
export interface RestaurantSettings extends RestaurantSettingsValues { id: number }
