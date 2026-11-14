export type PreparationStatus='pending'|'in_preparation'|'ready';
export interface ChefQueueItem {id:number;order_id:number;menu_item_id:number;quantity:number;modifiers:string|null;kitchen_notes:string|null;station:'kitchen'|'bar';status:PreparationStatus;created_at:string;menu_item:{id:number;name:string}|null;order:{id:number;service_type:'dine_in'|'takeout'|'delivery';table_number:string|null;created_at:string;sent_at:string}}
export interface ChefQueuePage {data:ChefQueueItem[];meta:{current_page:number;last_page:number;total:number}}
