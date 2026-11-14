
import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,OnInit,signal} from '@angular/core';
import {ActivatedRoute,Router} from '@angular/router';
import {ApiService} from '../../services/api.service';
import {SessionService} from '../../services/session.service';
import {CustomerOrder} from '../../services/customer.models';
import {ApiFormState} from '../../shared/forms/api-form-state';
import {customerCopy} from './customer-copy';
@Component({selector:'app-customer-orders',standalone:false,templateUrl:'./orders.component.html',styleUrl:'./customer.component.scss'})
export class CustomerOrdersComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly document=inject(DOCUMENT);private readonly zone=inject(NgZone);private destroyed=false;private denied=false;private timer:ReturnType<typeof setTimeout>|undefined;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=customerCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly order=signal<CustomerOrder|null>(null);protected readonly orders=signal<CustomerOrder[]>([]);protected readonly updated=signal<Date|null>(null);protected readonly pagination=signal({current_page:1,last_page:1,total:0});protected readonly id=Number(this.route.snapshot.paramMap.get('orderId')??0);protected readonly totalKeys=['subtotal','discount_total','tax_total','surcharge_total','total'] as const;
 private readonly visibility=()=>{if(this.document.hidden)clearTimeout(this.timer);else void this.load();};
 ngOnInit():void{this.document.addEventListener('visibilitychange',this.visibility);void this.start();}
 private async start(){if(this.route.snapshot.queryParamMap.has('payment_intent_client_secret'))await this.router.navigate([],{relativeTo:this.route,queryParams:{},replaceUrl:true});if(!this.destroyed)await this.load();}
 ngOnDestroy():void{this.destroyed=true;clearTimeout(this.timer);this.document.removeEventListener('visibilitychange',this.visibility);}
 private tracking():boolean{const order=this.order();return !order||['pending','authorized','refund_pending','refund_failed'].includes(order.advance_payment?.status??'pending')||order.status!=='cancelled'&&order.preparation_status!=='ready';}
 protected async load(page=this.pagination().current_page):Promise<void>{if(this.destroyed||this.denied||this.state.busy()||this.document.hidden||!Number.isSafeInteger(page)||page<1)return;clearTimeout(this.timer);const token=this.session.token;await this.state.run(async()=>{if(this.id){const {data}=await this.api.getCustomerOrder(this.id);if(!this.destroyed&&this.session.token===token){this.order.set(data.data);this.updated.set(new Date());}}else{const {data}=await this.api.getCustomerOrders(page);if(!this.destroyed&&this.session.token===token){this.orders.set(data.data);this.pagination.set(data.meta);}}});if(this.destroyed)return;if(this.session.token!==token&&!([401,403].includes(this.state.error()?.status??0)&&this.session.token===null)){this.denied=true;this.order.set(null);this.orders.set([]);return;}if([401,403].includes(this.state.error()?.status??0)){this.denied=true;this.order.set(null);this.orders.set([]);this.session.clear();await this.router.navigate(['/login']);return;}if(this.id&&this.tracking()&&!this.document.hidden&&![404,422].includes(this.state.error()?.status??0))this.zone.runOutsideAngular(()=>{this.timer=setTimeout(()=>this.zone.run(()=>void this.load()),5000);});}
}
