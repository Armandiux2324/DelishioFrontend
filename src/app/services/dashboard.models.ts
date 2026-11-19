export type DashboardPeriod='today'|'yesterday'|'week';
export type DashboardFilter={period:DashboardPeriod}|{from:string;to:string};
export type DashboardPaymentType='cash'|'card'|'transfer'|'online';
export interface DashboardData{period:DashboardPeriod|null;from:string;to:string;timezone:string;sales_count:number;sales_total:string;order_count:number;open_order_count:number;average_ticket:string;by_payment_method:Record<DashboardPaymentType,{transaction_count:number;amount:string;surcharge_amount:string;total_amount:string}>;by_category:{category_id:number;name:string;subtotal:string}[];top_employees:{employee_id:number;name:string;order_count:number;total_amount:string}[];sales_by_hour:{hour:number;sale_count:number;total_amount:string}[]}
