export interface CourtesiesFilter {from:string;to:string}
export interface CourtesyEntry {id:number;order_id:number;order_item_id:number|null;kind:'courtesy';percentage:string|null;amount:string;requested_by_employee_id:number;authorized_by_employee_id:number;work_shift_id:number;created_at:string;order:{id:number;status:'open'|'sent'|'closed'|'cancelled'}|null}
export interface CourtesiesData {filters:CourtesiesFilter;timezone:string;entries:CourtesyEntry[];totals:{entry_count:number;order_count:number;authorized_amount:string}}
