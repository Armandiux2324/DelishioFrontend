import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,OnInit,signal} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {ActivatedRoute,Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {AdminReportData,AdminReportFilter,AdminReportKind,AdminReportRow,adminReportKinds} from '../../../services/admin-reports.models';
import {Employee,EmployeeRole} from '../../../services/employee.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {adminReportDefinitions,ReportColumn,ReportSection} from './admin-report-definitions';
function date(control:AbstractControl){const value=String(control.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return {date:true};const parsed=new Date(value+'T00:00:00Z');return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value?{date:true}:null;}
@Component({selector:'app-admin-reports',standalone:false,templateUrl:'./admin-reports.component.html',styleUrl:'./admin-reports.component.scss'})
export class AdminReportsComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly route=inject(ActivatedRoute);private readonly builder=inject(NonNullableFormBuilder);private readonly document=inject(DOCUMENT);private readonly zone=inject(NgZone);private subscription?:Subscription;private version=0;private destroyed=false;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly english=this.locale==='en';protected readonly index=this.english?1:0;
 protected kind:AdminReportKind='discounts';protected definition=adminReportDefinitions.discounts;
 protected state=new ApiFormState(()=>this.locale);protected exportState=new ApiFormState(()=>this.locale);protected employeeState=new ApiFormState(()=>this.locale);
 protected readonly data=signal<AdminReportData|null>(null);protected readonly currency=signal<'USD'|'MXN'>('USD');protected readonly employees=signal<Employee[]>([]);
 protected readonly roles:EmployeeRole[]=['admin','waiter','chef'];
 protected readonly form=this.builder.group({from:['',[Validators.required,date]],to:['',[Validators.required,date]],employee_id:this.builder.control<number|null>(null),role:['',[Validators.pattern(/^(|admin|waiter|chef)$/)]]},{validators:control=>{const from=control.get('from'),to=control.get('to');return from?.valid&&to?.valid&&from.value>to.value?{range:true}:null;}});
 ngOnInit():void{this.subscription=this.route.data.subscribe(data=>{const kind=data['report'] as AdminReportKind;if(!adminReportKinds.includes(kind))return;this.version++;this.kind=kind;this.definition=adminReportDefinitions[kind];this.data.set(null);this.employees.set([]);this.form.reset();this.state=new ApiFormState(()=>this.locale);this.exportState=new ApiFormState(()=>this.locale);this.employeeState=new ApiFormState(()=>this.locale);if(kind==='employee-product-sales')void this.loadEmployees();});}
 ngOnDestroy():void{this.destroyed=true;this.version++;this.subscription?.unsubscribe();}
 protected busy(){return this.state.busy()||this.exportState.busy()||this.employeeState.busy();}
 protected label(value:[string,string]){return value[this.index];}
 protected roleName(value:string){return ({admin:['Administrador','Administrator'],waiter:['Mesero','Waiter'],chef:['Chef','Chef']} as Record<string,string[]>)[value]?.[this.index]??value;}
 protected employeeName(id:number|string){return this.employees().find(row=>String(row.user_id)===String(id))?.name??'#'+id;}
 protected rows(section:ReportSection){return this.data()?.[section.key]??[];}
 protected async loadEmployees():Promise<void>{if(this.destroyed||this.busy())return;await this.run(this.employeeState,async current=>{const rows:Employee[]=[];let page=1,last=1;do{if(!current())return;const {data}=await this.api.getEmployees(page);rows.push(...data.data);last=data.meta.last_page;page++;}while(page<=last);if(current())this.employees.set(rows);});}
 protected async load():Promise<void>{if(this.destroyed||this.busy())return;if(this.form.invalid){this.form.markAllAsTouched();return;}const values=this.form.getRawValue();const filter:AdminReportFilter={from:values.from,to:values.to};if(this.kind==='employee-product-sales'){if(values.employee_id!==null)filter.employee_id=values.employee_id;if(values.role)filter.role=values.role as EmployeeRole;}this.exportState.success.set('');this.exportState.error.set(null);const kind=this.kind;await this.run(this.state,async current=>{const [report,settings]=await Promise.all([this.api.getAdminReport(kind,filter),this.api.getRestaurantSettings()]);if(current()){this.currency.set(settings.data.data.currency);this.data.set(report.data.data);}});}
 protected async download():Promise<void>{const report=this.data();if(this.destroyed||this.busy()||!report)return;const filter={...report.filters},kind=this.kind;await this.run(this.exportState,async current=>{const response=await this.api.exportAdminReport(kind,filter);if(!current())return;const blob=response.data;if(!(blob instanceof Blob)||!blob.size||blob.type.split(';')[0]!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')throw Error('Invalid workbook response');const url=URL.createObjectURL(blob),anchor=this.document.createElement('a');anchor.href=url;anchor.download=kind+'_'+filter.from+'_'+filter.to+'.xlsx';this.document.body.appendChild(anchor);try{anchor.click();this.exportState.success.set(this.english?'XLSX download started.':'Descarga XLSX iniciada.');}finally{anchor.remove();this.zone.runOutsideAngular(()=>setTimeout(()=>URL.revokeObjectURL(url),1000));}});}
 protected cell(row:AdminReportRow|Record<string,string|number|null>,column:ReportColumn):string {
  let value:unknown=row;for(const key of column.key.split('.'))value=value!==null&&typeof value==='object'?(value as Record<string,unknown>)[key]:null;
  if(column.format==='cancelDate'){const fallback=!value;return this.formatDate(String(value??row['created_at']))+(fallback?(this.english?' · Creation (legacy)':' · Creación (antigua)'):(this.english?' · Cancellation':' · Cancelación'));}
  if(column.format==='scope')return value===null?(this.english?'Whole order':'Orden completa'):(this.english?'Line item #':'Partida #')+value;
  if(value===null||value===undefined)return '—';
  if(column.format==='money')return new Intl.NumberFormat(this.locale,{style:'currency',currency:this.currency(),minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
  if(column.format==='percent')return String(value)+'%';if(column.format==='date')return this.formatDate(String(value));if(column.format==='id')return '#'+value;
  const translations:Record<string,[string,string]>={open:['Abierta','Open'],sent:['Enviada','Sent'],closed:['Cerrada','Closed'],cancelled:['Cancelada','Cancelled'],pos:['POS','POS'],customer_app:['App del Cliente','Customer app'],doordash:['DoorDash','DoorDash'],ubereats:['Uber Eats','Uber Eats'],didi:['Didi','Didi'],rappi:['Rappi','Rappi']};
  if(['status','source','platform'].includes(column.format??''))return translations[String(value)]?.[this.index]??String(value);return String(value);
 }
 private formatDate(value:string):string{return new Intl.DateTimeFormat(this.locale,{dateStyle:'medium',timeStyle:'medium',timeZone:this.data()?.timezone??'UTC'}).format(new Date(value));}
 private async run(state:ApiFormState,work:(current:()=>boolean)=>Promise<void>):Promise<void>{const token=this.session.token,version=this.version;await state.run(()=>work(()=>!this.destroyed&&this.version===version&&this.session.token===token));if(!this.destroyed&&this.version===version&&[401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();this.data.set(null);await this.router.navigate(['/login']);}}
}
