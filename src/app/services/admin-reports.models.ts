import {EmployeeRole} from './employee.models';
export const adminReportKinds=['discounts','profit-margins','taxes-and-exemptions','tips','cancellations','external-platform-sales','employee-product-sales','work-shifts','payroll','sales-vs-labor','cash-closures','menu-audit','inventory-value','inventory-losses'] as const;
export type AdminReportKind=typeof adminReportKinds[number];
export interface AdminReportFilter {from?:string;to?:string;cash_register_id?:number|string;menu_item_id?:number|string;inventory_item_id?:number|string;employee_id?:number|string;role?:EmployeeRole}
export interface AdminReportRow {[field:string]:unknown}
export interface AdminReportData {filters:AdminReportFilter;timezone?:string;totals:Record<string,unknown>;entries?:AdminReportRow[];orders?:AdminReportRow[];exemptions?:AdminReportRow[];items?:AdminReportRow[];products?:AdminReportRow[];platforms?:AdminReportRow[];shifts?:AdminReportRow[];employees?:AdminReportRow[];closures?:AdminReportRow[];losses?:AdminReportRow[];overtime_weekly_hours?:string;overtime_multiplier?:string;cost_basis?:string;missing_timestamp_date_basis?:string}
