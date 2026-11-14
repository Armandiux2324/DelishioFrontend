
import {Promotion} from './customer-promotion.models';
export interface CustomerPage<T>{data:T[];meta:{current_page:number;last_page:number;total:number}}
export interface CustomerRestaurant{id:number;name:string;description:string|null;address:string|null;phone:string|null;logo_url:string|null;schedule:string|null;currency:'USD'|'MXN';loyalty_enabled:boolean;loyalty_factor:string|null;loyalty_redeem_value:string|null;dual_pricing_enabled:boolean;dual_pricing_percentage:string|null}
export interface CustomerMenuItem{id:number;category_id:number;name:string;sale_price:string;description:string|null;image_url:string|null;legal_age_required:boolean;category:{id:number;name:string;super_category_id:number}|null;tax_percentage:string|null}
export interface CustomerCartItem{menu_item_id:number;quantity:number;modifiers:string|null;kitchen_notes:string|null}
export interface CustomerOrderInput{service_type:'takeout';items:CustomerCartItem[]}
export type AdvancePaymentStatus='pending'|'authorized'|'captured'|'voided'|'refund_pending'|'refunded'|'refund_failed';
export interface CustomerOrder{id:number;restaurant_id:number;source:'customer_app';service_type:'takeout';status:'open'|'sent'|'closed'|'cancelled';subtotal:string;tax_total:string;discount_total:string;total:string;loyalty_redeemed_amount:string;surcharge_total:string;created_at:string;currency:'USD'|'MXN'|null;sent_at:string|null;closed_at:string|null;cancel_reason?:string;preparation_status:'pending'|'in_preparation'|'ready';items:{id:number;menu_item_id:number;name:string|null;quantity:number;unit_price:string;modifiers:string|null;kitchen_notes:string|null;status:'pending'|'in_preparation'|'ready';cancelled:boolean}[];advance_payment:{status:AdvancePaymentStatus;authorized_at:string|null;captured_at:string|null;currency:'USD'|'MXN';refund_attempts:number;refunded_at:string|null}|null}
export interface CustomerPayment{payment_intent_id:string;client_secret:string;stripe_account_id:string;publishable_key:string;currency:'USD'|'MXN';amount:string;status:AdvancePaymentStatus;stripe_status:string}
export interface CustomerBalance{restaurant_id:number;restaurant_name:string|null;points_balance:string}
export interface CustomerBalancesPage{data:CustomerBalance[];current_page:number;last_page:number;total:number}
export type CustomerPromotion=Promotion;
