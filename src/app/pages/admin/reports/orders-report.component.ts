
import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,signal,ViewChild} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {OrdersReportFilter,OrdersReportPage,OrdersReportType,ReportOrder} from '../../../services/orders-report.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {DialogComponent} from '../../../shared/dialog/dialog.component';
import {ordersReportCopy} from './orders-report-copy';
function date(control:AbstractControl){const value=String(control.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return {date:true};const parsed=new Date(value+'T00:00:00Z');return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value?{date:true}:null;}
@Component({selector:'app-orders-report',standalone:false,templateUrl:'./orders-report.component.html',styleUrl:'./orders-report.component.scss'})
export class OrdersReportComponent implements OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly builder=inject(NonNullableFormBuilder);private readonly document=inject(DOCUMENT);private readonly zone=inject(NgZone);private destroyed=false;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=ordersReportCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly exportState=new ApiFormState(()=>this.locale);protected readonly data=signal<OrdersReportPage|null>(null);protected readonly currency=signal<'USD'|'MXN'>('USD');protected readonly selected=signal<ReportOrder|null>(null);protected readonly types:OrdersReportType[]=['paid','open','online'];protected readonly dates=['created_at','sent_at','closed_at'] as const;protected readonly amounts=['subtotal','discount_total','loyalty_redeemed_amount','tax_total','delivery_fee','surcharge_total','tip_amount','total'] as const;
 protected readonly form=this.builder.group({type:this.builder.control<OrdersReportType>('paid',[Validators.required,Validators.pattern(/^(paid|open|online)$/)]),from:['',[Validators.required,date]],to:['',[Validators.required,date]]},{validators:control=>{const from=control.get('from'),to=control.get('to');return from?.valid&&to?.valid&&from.value>to.value?{range:true}:null;}});
 @ViewChild('detailDialog',{static:true})protected detailDialog!:DialogComponent;
 ngOnDestroy():void{this.destroyed=true;}
 protected busy(){return this.state.busy()||this.exportState.busy();}
 protected async load():Promise<void>{if(this.destroyed||this.busy())return;if(this.form.invalid){this.form.markAllAsTouched();return;}await this.query(this.form.getRawValue(),1);}
 protected async page(page:number):Promise<void>{const data=this.data();if(this.destroyed||this.busy()||!data||!Number.isSafeInteger(page)||page<1||page>data.meta.last_page)return;const {type,from,to}=data.filters;await this.query({type,from,to},page);}
 private async query(filter:OrdersReportFilter,page:number){this.exportState.success.set('');this.exportState.error.set(null);await this.run(this.state,async current=>{let [report,settings]=await Promise.all([this.api.getOrdersReport(filter,page),this.api.getRestaurantSettings()]);if(!current())return;if(report.data.meta.current_page>report.data.meta.last_page)report=await this.api.getOrdersReport(filter,report.data.meta.last_page);if(current()){this.currency.set(settings.data.data.currency);this.data.set(report.data);}});}
 protected show(order:ReportOrder):void{if(this.busy()||!this.data()?.data.some(row=>row.id===order.id))return;this.selected.set(order);this.detailDialog.open();}
 protected async download():Promise<void>{const data=this.data();if(this.destroyed||this.busy()||!data)return;const {type,from,to}=data.filters;await this.run(this.exportState,async current=>{const response=await this.api.exportOrdersReport({type,from,to});if(!current())return;const blob=response.data;if(!(blob instanceof Blob)||!blob.size||blob.type.split(';')[0]!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')throw Error('Invalid workbook response');const url=URL.createObjectURL(blob),anchor=this.document.createElement('a');anchor.href=url;anchor.download='orders_'+type+'_'+from+'_'+to+'.xlsx';this.document.body.appendChild(anchor);try{anchor.click();this.exportState.success.set(this.text.downloaded);}finally{anchor.remove();this.zone.runOutsideAngular(()=>setTimeout(()=>URL.revokeObjectURL(url),1000));}});}
 private async run(state:ApiFormState,work:(current:()=>boolean)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(()=>!this.destroyed&&this.session.token===token));if(!this.destroyed&&[401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();this.data.set(null);await this.router.navigate(['/login']);}}
}
