
import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,signal} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {SalesSummaryData} from '../../../services/sales-summary.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {salesSummaryCopy} from './sales-summary-copy';
const xlsxType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function date(control:AbstractControl){const value=String(control.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return {date:true};const parsed=new Date(value+'T00:00:00Z');return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value?{date:true}:null;}
@Component({selector:'app-sales-summary',standalone:false,templateUrl:'./sales-summary.component.html',styleUrl:'./sales-summary.component.scss'})
export class SalesSummaryComponent implements OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly builder=inject(NonNullableFormBuilder);private readonly document=inject(DOCUMENT);private readonly zone=inject(NgZone);private destroyed=false;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=salesSummaryCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly exportState=new ApiFormState(()=>this.locale);protected readonly data=signal<SalesSummaryData|null>(null);protected readonly currency=signal<'USD'|'MXN'>('USD');
 protected readonly orderFields=['subtotal','discount_total','loyalty_redeemed_amount','net_consumption','tax_total','delivery_fee','tip_amount','surcharge_total','total'] as const;
 protected readonly platformFields=['total_amount','commission_amount','net_amount'] as const;
 protected readonly form=this.builder.group({from:['',[Validators.required,date]],to:['',[Validators.required,date]]},{validators:control=>{const from=control.get('from'),to=control.get('to');return from?.valid&&to?.valid&&from.value>to.value?{range:true}:null;}});
 ngOnDestroy():void{this.destroyed=true;}
 protected busy(){return this.state.busy()||this.exportState.busy();}
 protected async load():Promise<void>{if(this.destroyed||this.busy())return;if(this.form.invalid){this.form.markAllAsTouched();return;}const filter=this.form.getRawValue();this.exportState.success.set('');this.exportState.error.set(null);await this.run(this.state,async current=>{const [report,settings]=await Promise.all([this.api.getSalesSummaryReport(filter),this.api.getRestaurantSettings()]);if(current()){this.currency.set(settings.data.data.currency);this.data.set(report.data.data);}});}
 protected async download():Promise<void>{const report=this.data();if(this.destroyed||this.busy()||!report)return;const filter={from:report.from,to:report.to};await this.run(this.exportState,async current=>{const response=await this.api.exportSalesSummaryReport(filter);if(!current())return;const blob=response.data;if(!(blob instanceof Blob)||!blob.size||blob.type.split(';')[0]!==xlsxType)throw Error('Invalid workbook response');const url=URL.createObjectURL(blob);const anchor=this.document.createElement('a');anchor.href=url;anchor.download='sales-summary_'+filter.from+'_'+filter.to+'.xlsx';this.document.body.appendChild(anchor);try{anchor.click();this.exportState.success.set(this.text.downloaded);}finally{anchor.remove();this.zone.runOutsideAngular(()=>setTimeout(()=>URL.revokeObjectURL(url),1000));}});}
 private async run(state:ApiFormState,work:(current:()=>boolean)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(()=>!this.destroyed&&this.session.token===token));if(!this.destroyed&&[401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();this.data.set(null);await this.router.navigate(['/login']);}}
}
