export interface AdminCustomer {user_id:number;name:string;email:string;active:boolean;phone:string|null;restaurant_id:number;points_balance:string}
export interface AdminPage<T> {data:T[];meta:{current_page:number;last_page:number;total:number}}
export type PromotionCondition='min_amount'|'product_quantity'|'category_discount';
export type PromotionDiscount='percentage'|'fixed_amount';
export type WeekDay='Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun';
export interface PromotionPayload {name:string;condition_type:PromotionCondition;condition_value:string|null;discount_type:PromotionDiscount;discount_value:string;days_of_week:string|null;time_start:string|null;time_end:string|null;valid_from:string;valid_to:string;active:boolean;menu_item_ids:number[];category_ids:number[]}
export interface Promotion extends PromotionPayload {id:number;restaurant_id:number}
