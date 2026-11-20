import {CustomerQrScannerComponent} from '../../../shared/customer-qr/customer-qr-scanner.component';
import {customerQrPattern} from '../../../shared/customer-qr/customer-qr';

import {Component,EventEmitter,inject,Input,OnChanges,OnDestroy,Output,ViewChild,signal} from '@angular/core';
import {NonNullableFormBuilder,Validators} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {CheckoutInput,CheckoutQuote,PaymentMethod,WaiterOrder} from '../../../services/waiter-order.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {DialogComponent} from '../../../shared/dialog/dialog.component';
import {checkoutCopy} from './checkout-copy';
const amount=(max:number,min=0)=>[Validators.required,Validators.pattern(/^\d+(?:\.\d{1,2})?$/),Validators.min(min),Validators.max(max)];
@Component({selector:'app-order-checkout',standalone:false,templateUrl:'./checkout.component.html',styleUrl:'./checkout.component.scss'})
export class CheckoutComponent implements OnChanges,OnDestroy {
 @Input({required:true}) order!:WaiterOrder;
 @Input() disabled=false;
 @Output() changed=new EventEmitter<WaiterOrder>();
 private readonly api=inject(ApiService);
 private readonly session=inject(SessionService);
 private readonly router=inject(Router);
 private readonly builder=inject(NonNullableFormBuilder);
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';
 protected readonly text=checkoutCopy[this.locale];
 protected readonly state=new ApiFormState(()=>this.locale);
 protected readonly quote=signal<CheckoutQuote|null>(null);
 protected readonly notice=signal('');
 protected readonly methods:PaymentMethod[]=['cash','transfer','card'];
 protected readonly moneyKeys=['subtotal','discount_total','loyalty_redeemed_amount','tax_total','tip_amount','surcharge_total','payment_base_total','card_amount','card_charge_total','payment_total','payment_difference','total'] as const;
 protected readonly pointKeys=['points_redeemed','points_earned','points_balance'] as const;
 protected readonly form=this.builder.group({cash:['',amount(99999999.99,.01).slice(1)],transfer:['',amount(99999999.99,.01).slice(1)],card:['',amount(99999999.99,.01).slice(1)],tip_amount:['0',amount(99999999.99)],redeem_points:['0',amount(9999999999.99)]});
 protected readonly customerForm=this.builder.group({qr_code:['',[Validators.required,Validators.pattern(customerQrPattern)]]});
 protected readonly scanning=signal(false);private scanOrderId:number|null=null;private scanToken:string|null=null;private destroyed=false;
 @ViewChild(CustomerQrScannerComponent)private scanner?:CustomerQrScannerComponent;
 ngOnChanges():void{if(this.scanning()&&(this.order.id!==this.scanOrderId||!this.linkable()||this.disabled))this.stopScanning();}
 ngOnDestroy():void{this.destroyed=true;this.stopScanning();}
 protected stopScanning():void{this.scanner?.stop();this.scanning.set(false);this.scanOrderId=null;this.scanToken=null;}
 protected startScanning():void{if(this.destroyed||this.disabled||this.state.busy()||!this.linkable())return;this.scanOrderId=this.order.id;this.scanToken=this.session.token;this.scanning.set(true);}
 protected async scanned(value:string):Promise<void>{const allowed=this.scanning()&&this.scanOrderId===this.order.id&&this.scanToken===this.session.token;this.stopScanning();if(!allowed||this.destroyed||this.disabled||this.state.busy()||!this.linkable()||!customerQrPattern.test(value))return;this.customerForm.controls.qr_code.setValue(value);await this.link();}
 private reviewed:CheckoutInput|null=null;
 @ViewChild('customerDialog',{static:true}) protected customerDialog!:DialogComponent;
 @ViewChild('checkoutDialog',{static:true}) protected checkoutDialog!:DialogComponent;
 constructor(){this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(()=>this.invalidate());const token=this.session.token;this.session.session$.pipe(takeUntilDestroyed()).subscribe(()=>{if(this.session.token!==token)this.stopScanning();});}
 protected linkable():boolean{return this.order.source==='pos'&&['open','sent'].includes(this.order.status)&&this.order.closed_at===null;}
 protected payable():boolean{return this.linkable()&&this.order.status==='sent'&&this.order.sent_at!==null;}
 protected invalidate():void{this.quote.set(null);this.reviewed=null;}
 protected openCustomer():void{if(this.disabled||this.state.busy()||!this.linkable())return;this.stopScanning();this.customerForm.reset();this.state.error.set(null);this.notice.set('');this.customerDialog.open();}
 protected open():void{if(this.disabled||this.state.busy()||!this.payable())return;this.form.reset({cash:'',transfer:'',card:'',tip_amount:'0',redeem_points:'0'});this.state.error.set(null);this.notice.set('');this.checkoutDialog.open();}
 protected async link():Promise<void>{if(this.disabled||this.state.busy()||!this.linkable())return;if(this.customerForm.invalid){this.customerForm.markAllAsTouched();return;}this.stopScanning();await this.request(async(token,id)=>{const {data}=await this.api.linkWaiterCustomer(id,this.customerForm.controls.qr_code.value);if(this.destroyed||this.session.token!==token||this.order.id!==id)return;this.invalidate();this.changed.emit(data.data);this.notice.set(this.text.linked);this.customerDialog.close();});}
 private payload():CheckoutInput{return {payments:this.methods.filter(method=>this.form.controls[method].value!=='').map(method=>({method,amount:this.form.controls[method].value})),tip_amount:this.form.controls.tip_amount.value,redeem_points:this.form.controls.redeem_points.value};}
 protected async calculate(remainder=false):Promise<void>{if(this.disabled||this.state.busy()||!this.payable())return;this.invalidate();if(remainder)this.form.controls.card.setValue('');if(this.form.invalid){this.form.markAllAsTouched();return;}await this.request(async(token,id)=>{let payload=this.payload();let {data}=await this.api.previewWaiterCheckout(id,payload);if(this.session.token!==token||this.order.id!==id)return;if(remainder){this.form.controls.card.setValue(data.data.card_amount==='0.00'?'':data.data.card_amount);payload=this.payload();const response=await this.api.previewWaiterCheckout(id,payload);if(this.session.token!==token||this.order.id!==id)return;data=response.data;}this.reviewed=payload;this.quote.set(data.data);});}
 protected async close():Promise<void>{if(this.disabled||this.state.busy()||!this.payable()||!this.reviewed||this.quote()?.payment_difference!=='0.00'||this.form.invalid)return;const payload=this.reviewed;await this.request(async(token,id)=>{const {data}=await this.api.closeWaiterOrder(id,payload);if(this.session.token!==token||this.order.id!==id)return;this.changed.emit(data.data);this.notice.set(this.text.closed);this.checkoutDialog.close();});this.invalidate();}
 private async request(work:(token:string|null,id:number)=>Promise<void>):Promise<void>{if(this.destroyed)return;const token=this.session.token;await this.state.run(()=>work(token,this.order.id));if(!this.destroyed&&[401,403].includes(this.state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
}
