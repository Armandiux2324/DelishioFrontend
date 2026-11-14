import {Order} from './api.models';
export type ServiceType='dine_in'|'takeout'|'delivery';
export interface CreateWaiterOrder {service_type:ServiceType;table_number?:string;delivery_address?:string|null;delivery_fee?:string}
export interface OrderItemInput {menu_item_id:number;quantity:number;modifiers:string|null;kitchen_notes:string|null}
export interface WaiterOrderItem {id:number;order_id:number;menu_item_id:number;quantity:number;unit_price:string;modifiers:string|null;kitchen_notes:string|null;station:'none'|'kitchen'|'bar';status:'pending'|'in_preparation'|'ready';cancelled:boolean;cancel_reason?:string|null;menu_item:{id:number;name:string;legal_age_required:boolean}|null}
export interface WaiterOrder extends Order {restaurant_id:number;waiter_employee_id:number;customer_id:number|null;source:'pos'|'customer_app';delivery_address:string|null;sent_at:string|null;created_at:string;closed_at:string|null;subtotal:string;tax_total:string;discount_total:string;loyalty_redeemed_amount:string;surcharge_total:string;tip_amount:string;total:string;items:WaiterOrderItem[];discounts?:OrderDiscount[];tax_exemptions?:TaxExemption[]}
export interface WaiterOrdersPage {data:WaiterOrder[];meta:{current_page:number;last_page:number;total:number}}

export type AdjustmentAction='discount'|'courtesy'|'exempt'|'cancel'|'cancelItem';
export type DiscountInput={pin:string;order_item_id?:number}&({percentage:string;amount?:never}|{amount:string;percentage?:never});
export interface ExemptionInput {reason:string;order_item_id?:number}
export interface CancellationInput {reason:string;pin?:string}
export interface OrderDiscount {id:number;order_item_id:number|null;kind:'discount'|'courtesy';percentage:string|null;amount:string;requested_by_employee_id:number;authorized_by_employee_id:number;created_at:string}
export interface TaxExemption {id:number;order_item_id:number|null;reason:string;requested_by_employee_id:number;created_at:string}
