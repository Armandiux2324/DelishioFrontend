export interface SalesSummaryFilter {from:string;to:string;from_time?:string;to_time?:string;cash_register_id?:number}
export interface SalesSummaryData extends Pick<SalesSummaryFilter,'from'|'to'> {
 timezone:string;from_time:string|null;to_time:string|null;cash_register_id:number|null;
 orders:{order_count:number;subtotal:string;discount_total:string;loyalty_redeemed_amount:string;net_consumption:string;tax_total:string;delivery_fee:string;tip_amount:string;surcharge_total:string;total:string};
 external_platform:{sale_count:number;total_amount:string;commission_amount:string;net_amount:string};
 totals:{sale_count:number;total_amount:string;amount_after_platform_commission:string};
}
