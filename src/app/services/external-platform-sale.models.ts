export type ExternalPlatform='doordash'|'ubereats'|'didi'|'rappi';
export interface ExternalSaleItemInput{menu_item_id:number|null;description:string;quantity:number;unit_price:string}
export interface ExternalSaleInput{platform:ExternalPlatform;total_amount:string;commission_amount:string;sale_date?:string;items:ExternalSaleItemInput[]}
export interface ExternalSale extends ExternalSaleInput{id:number;net_amount:string;registered_by_employee_id:number;sale_date:string;items:(ExternalSaleItemInput&{id:number;external_sale_id:number})[]}
export interface ExternalSalesPage{data:ExternalSale[];meta:{current_page:number;last_page:number;total:number}}
