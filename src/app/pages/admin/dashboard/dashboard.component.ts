
import {Component,inject,OnDestroy,OnInit,signal} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {DashboardData,DashboardFilter,DashboardPeriod,DashboardPaymentType} from '../../../services/dashboard.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {dashboardCopy} from './dashboard-copy';
function validDate(control:AbstractControl){const value=String(control.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return {date:true};const date=new Date(value+'T00:00:00Z');return Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value?{date:true}:null;}
@Component({selector:'app-admin-dashboard',standalone:false,templateUrl:'./dashboard.component.html',styleUrl:'./dashboard.component.scss'})
export class DashboardComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly builder=inject(NonNullableFormBuilder);private destroyed=false;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=dashboardCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly data=signal<DashboardData|null>(null);protected readonly currency=signal<'USD'|'MXN'>('USD');
 protected readonly periods:('custom'|DashboardPeriod)[]=['today','yesterday','week','custom'];protected readonly paymentTypes:DashboardPaymentType[]=['cash','card','transfer','online'];protected readonly metrics=['sales_total','average_ticket','sales_count','order_count','open_order_count'] as const;
 protected readonly form=this.builder.group({period:this.builder.control<DashboardPeriod|'custom'>('today',[Validators.required,Validators.pattern(/^(today|yesterday|week|custom)$/)]),from:['',[Validators.required,validDate]],to:['',[Validators.required,validDate]]},{validators:control=>{const from=control.get('from'),to=control.get('to');return from?.enabled&&to?.enabled&&from.valid&&to.valid&&from.value>to.value?{range:true}:null;}});
 ngOnInit():void{this.updateFields();void this.load();}ngOnDestroy():void{this.destroyed=true;}
 protected updateFields():void{for(const key of ['from','to'] as const){if(this.form.controls.period.value==='custom')this.form.controls[key].enable();else this.form.controls[key].disable();}}
 protected width(value:string):number{const max=Math.max(0,...(this.data()?.sales_by_hour.map(row=>Number(row.total_amount))??[]));return max>0?Math.max(0,Math.min(100,Number(value)/max*100)):0;}
 protected async load():Promise<void>{if(this.destroyed||this.state.busy())return;if(this.form.invalid){this.form.markAllAsTouched();return;}const value=this.form.getRawValue();const filter:DashboardFilter=value.period==='custom'?{from:value.from,to:value.to}:{period:value.period};const token=this.session.token;await this.state.run(async()=>{const [dashboard,settings]=await Promise.all([this.api.getAdminDashboard(filter),this.api.getRestaurantSettings()]);if(this.destroyed||this.session.token!==token)return;this.currency.set(settings.data.data.currency);this.data.set(dashboard.data.data);});if(!this.destroyed&&[401,403].includes(this.state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();this.data.set(null);await this.router.navigate(['/login']);}}
}
