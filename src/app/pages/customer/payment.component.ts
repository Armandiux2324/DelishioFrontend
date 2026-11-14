
import {Component,ElementRef,EventEmitter,inject,Input,OnDestroy,OnChanges,Output,signal,SimpleChanges,ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import type {Stripe,StripeElements,StripePaymentElement} from '@stripe/stripe-js';
import {ApiService} from '../../services/api.service';
import {SessionService} from '../../services/session.service';
import {StripePaymentService} from '../../services/stripe-payment.service';
import {CustomerOrder} from '../../services/customer.models';
import {ApiFormState} from '../../shared/forms/api-form-state';
import {customerCopy} from './customer-copy';
@Component({selector:'app-customer-payment',standalone:false,templateUrl:'./payment.component.html'})
export class PaymentComponent implements OnDestroy,OnChanges {
 @Input({required:true})order!:CustomerOrder;@Output()submitted=new EventEmitter<void>();
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly sdk=inject(StripePaymentService);private readonly router=inject(Router);private destroyed=false;private generation=0;private stripe:Stripe|null=null;private elements:StripeElements|null=null;private element:StripePaymentElement|null=null;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=customerCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly ready=signal(false);protected readonly waiting=signal(false);protected readonly error=signal('');
 @ViewChild('mount',{static:true})private mount!:ElementRef<HTMLElement>;
 ngOnDestroy():void{this.destroyed=true;this.clear();}
 ngOnChanges(changes:SimpleChanges={}):void{const previous=changes['order']?.previousValue as CustomerOrder|undefined;if(previous&&previous.id!==this.order.id){this.clear();this.waiting.set(false);this.error.set('');}if(this.order&&(this.order.status!=='open'||this.order.advance_payment?.status!=='pending'))this.clear();}
 private clear():void{this.generation++;this.element?.destroy();this.element=null;this.elements=null;this.stripe=null;this.ready.set(false);}
 protected allowed():boolean{return this.order.status==='open'&&this.order.advance_payment?.status==='pending';}
 protected async prepare():Promise<void>{if(this.state.busy()||!this.allowed()||this.destroyed)return;this.clear();this.error.set('');this.waiting.set(false);const generation=this.generation,token=this.session.token,id=this.order.id;await this.state.run(async()=>{const {data}=await this.api.getCustomerPayment(id);if(this.destroyed||generation!==this.generation||token!==this.session.token)return;const payment=data.data;if(['requires_capture','processing','succeeded'].includes(payment.stripe_status)){this.waiting.set(true);this.submitted.emit();return;}const stripe=await this.sdk.load(payment.publishable_key,payment.stripe_account_id);if(this.destroyed||generation!==this.generation||token!==this.session.token)return;if(!stripe)throw Error('Stripe unavailable');this.stripe=stripe;this.elements=stripe.elements({clientSecret:payment.client_secret,locale:this.locale,appearance:{theme:'stripe',variables:{colorPrimary:'#2740f0',borderRadius:'12px'}}});this.element=this.elements.create('payment');this.element.on('ready',()=>{if(!this.destroyed&&generation===this.generation)this.ready.set(true);});this.element.on('loaderror',()=>{if(!this.destroyed&&generation===this.generation){this.error.set(this.text.paymentError);this.ready.set(false);}});this.element.mount(this.mount.nativeElement);});if([401,403].includes(this.state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
 protected async confirm():Promise<void>{if(this.destroyed||this.state.busy()||!this.ready()||!this.allowed()||!this.stripe||!this.elements)return;const stripe=this.stripe,elements=this.elements,token=this.session.token,generation=this.generation,id=this.order.id;this.error.set('');await this.state.run(async()=>{const result=await stripe.confirmPayment({elements,confirmParams:{return_url:location.origin+'/cliente/orders/'+id},redirect:'if_required'});if(this.destroyed||token!==this.session.token||generation!==this.generation)return;if(result.error){this.error.set(result.error.message??this.text.paymentError);return;}this.waiting.set(true);this.clear();this.submitted.emit();});}
}
