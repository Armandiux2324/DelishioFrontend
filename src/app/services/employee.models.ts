export type EmployeeRole = 'admin' | 'waiter' | 'chef';
export type EmployeeStation = 'kitchen' | 'bar';
export interface Employee {
 user_id:number; restaurant_id:number; name:string; username:string|null; email:string; locale:'en'|'es'; active:boolean;
 phone:string|null; role:EmployeeRole; station:EmployeeStation|null; hourly_rate:string; created_at:string|null; updated_at:string|null;
}
export interface EmployeeFields { name:string; email:string; username:string|null; locale:'en'|'es'; phone:string|null; role:EmployeeRole; station?:EmployeeStation; hourly_rate:string; active:boolean }
export interface EmployeeSecrets { password?:string; password_confirmation?:string; pin?:string }
export type EmployeeCreate = EmployeeFields & EmployeeSecrets & {password:string;password_confirmation:string};
export type EmployeeUpdate = Partial<EmployeeFields> & EmployeeSecrets;
export interface EmployeePage {data:Employee[];meta:{current_page:number;last_page:number;total:number}}
export interface EmployeeCreated {data:Employee;meta?:{generated_pin?:string}}
