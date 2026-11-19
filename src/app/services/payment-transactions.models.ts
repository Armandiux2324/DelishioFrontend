export interface PaymentReportFilter{from:string;to:string}
export type PaymentReportType='cash'|'card'|'transfer'|'online';
export interface PaymentReportTotals{transaction_count:number;amount:string;surcharge_amount:string;total_amount:string}
export interface PaymentTransactionsData extends PaymentReportFilter{timezone:string;by_type:Record<PaymentReportType,PaymentReportTotals>;totals:PaymentReportTotals}
