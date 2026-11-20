import {EmployeeRole} from './employee.models';
export const adminReportKinds=['discounts','profit-margins','taxes-and-exemptions','tips','cancellations','external-platform-sales','employee-product-sales'] as const;
export type AdminReportKind=typeof adminReportKinds[number];
export interface AdminReportFilter {from:string;to:string;employee_id?:number|string;role?:EmployeeRole}
export interface AdminReportRow {[field:string]:string|number|null|{id:number;status:string}}
export interface AdminReportData {filters:AdminReportFilter;timezone:string;totals:Record<string,string|number|null>;entries?:AdminReportRow[];orders?:AdminReportRow[];exemptions?:AdminReportRow[];items?:AdminReportRow[];products?:AdminReportRow[];platforms?:AdminReportRow[];cost_basis?:string;missing_timestamp_date_basis?:string}
