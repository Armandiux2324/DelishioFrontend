export interface OperationsPage<T> {data:T[];meta:{current_page:number;last_page:number;total:number}}
export interface WorkShift {id:number;employee_id:number;clock_in:string;clock_out:string|null}
export interface CashRegister {id:number;restaurant_id:number;opened_by_employee_id:number;opening_amount:string;opened_at:string;closed_by_employee_id:number|null;counted_cash:string|null;expected_cash:string|null;difference:string|null;closed_at:string|null}
export type CashMovementType='cash_in'|'cash_out';
export type CashReason='payroll'|'minor_purchase'|'other';
export interface CashMovementPayload {cash_register_id:number;type:CashMovementType;amount:string;reason?:CashReason;related_employee_id?:number;payroll_period_start?:string;payroll_period_end?:string}
export interface CashMovement {id:number;cash_register_id:number;type:CashMovementType;amount:string;reason:CashReason|null;related_employee_id:number|null;payroll_period_start:string|null;payroll_period_end:string|null;registered_by_employee_id:number;created_at:string}
