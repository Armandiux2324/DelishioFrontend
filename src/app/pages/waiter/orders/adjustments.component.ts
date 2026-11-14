
import {Component,EventEmitter,inject,Input,Output,ViewChild,signal} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {AdjustmentAction,WaiterOrder} from '../../../services/waiter-order.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {DialogComponent} from '../../../shared/dialog/dialog.component';
import {adjustmentCopy} from './adjustment-copy';
@Component({selector:'app-order-adjustments',standalone:false,templateUrl:'./adjustments.component.html',styleUrl:'./adjustments.component.scss'})
export class AdjustmentsComponent {
 @Input({required:true}) order!:WaiterOrder;@Input() disabled=false;@Output() changed=new EventEmitter<WaiterOrder>();
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly builder=inject(NonNullableFormBuilder);
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=adjustmentCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly action=signal<AdjustmentAction>('discount');protected readonly notice=signal('');
 @ViewChild('dialog',{static:true}) protected dialog!:DialogComponent;
 protected readonly form=this.builder.group({scope:[''],method:['percentage',Validators.pattern(/^(percentage|amount)$/)],value:['',[Validators.required,Validators.pattern(/^\d+(?:\.\d{1,2})?$/),Validators.min(.01)]],reason:['',[Validators.required,Validators.pattern(/\S/),(control:AbstractControl)=>new TextEncoder().encode(control.value).length>65535?{bytes:true}:null]],pin:['',[Validators.required,Validators.pattern(/^[0-9]{4,6}$/)]]});
 protected readonly actions:AdjustmentAction[]=['discount','courtesy','exempt','cancel','cancelItem'];
 protected editable():boolean{return ['open','sent'].includes(this.order.status)&&this.order.closed_at===null;}
 protected requiresPin():boolean{return ['discount','courtesy'].includes(this.action())||this.action().startsWith('cancel')&&(this.order.sent_at!==null||this.order.status==='sent');}
 protected items(){return this.order.items.filter(item=>!item.cancelled);}
 protected open(action:AdjustmentAction):void{if(this.disabled||this.state.busy()||!this.editable()||action==='cancelItem'&&!this.items().length)return;this.action.set(action);this.form.reset({scope:action==='cancelItem'?String(this.items()[0].id):'',method:'percentage'});this.state.error.set(null);this.notice.set('');this.updateFields();this.dialog.open();}
 protected updateFields():void{const action=this.action();const fields={scope:['discount','exempt','cancelItem'].includes(action),method:action==='discount',value:action==='discount',reason:['exempt','cancel','cancelItem'].includes(action),pin:this.requiresPin()};for(const key of Object.keys(fields) as (keyof typeof fields)[]){if(fields[key])this.form.controls[key].enable();else this.form.controls[key].disable();}this.form.controls.value.setValidators([Validators.required,Validators.pattern(/^\d+(?:\.\d{1,2})?$/),Validators.min(.01),Validators.max(this.form.controls.method.value==='percentage'?100:99999999.99)]);this.form.controls.value.updateValueAndValidity();}
 protected clearPin():void{this.form.controls.pin.reset('');}
 protected async save():Promise<void>{if(this.disabled||this.state.busy()||!this.editable())return;this.updateFields();const value=this.form.getRawValue();const action=this.action();if(['discount','exempt','cancelItem'].includes(action)&&((action==='cancelItem'&&!value.scope)||(value.scope&&!this.items().some(item=>String(item.id)===value.scope))))this.form.controls.scope.setErrors({unavailable:true});if(this.form.invalid){this.form.markAllAsTouched();return;}const token=this.session.token;const orderId=this.order.id;const target=value.scope?{order_item_id:Number(value.scope)}:{};await this.state.run(async()=>{let response;if(action==='discount')response=await this.api.discountWaiterOrder(orderId,{...target,pin:value.pin,...(value.method==='percentage'?{percentage:value.value}:{amount:value.value})});else if(action==='courtesy')response=await this.api.courtesyWaiterOrder(orderId,value.pin);else if(action==='exempt')response=await this.api.exemptWaiterOrder(orderId,{...target,reason:value.reason.trim()});else{const payload={reason:value.reason.trim(),...(this.requiresPin()?{pin:value.pin}:{})};response=action==='cancelItem'?await this.api.cancelWaiterOrderItem(orderId,Number(value.scope),payload):await this.api.cancelWaiterOrder(orderId,payload);}if(this.session.token!==token||this.order.id!==orderId)return;this.clearPin();this.changed.emit(response.data.data);this.notice.set(this.text.success);this.dialog.close();});this.clearPin();if([401,403].includes(this.state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
}
