import {Component,computed,inject,OnInit,signal,ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {AdminCustomer} from '../../../services/customer-promotion.models';
import {SessionService} from '../../../services/session.service';
import {DialogComponent} from '../../../shared/dialog/dialog.component';
import {ApiFormState} from '../../../shared/forms/api-form-state';
@Component({selector:'app-admin-customers',standalone:false,templateUrl:'./customers.component.html',styleUrl:'./customers.component.scss'})
export class CustomersComponent implements OnInit {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);
 protected readonly english=this.session.user?.locale==='en';protected readonly loadState=new ApiFormState(()=>this.english?'en':'es');protected readonly detailState=new ApiFormState(()=>this.english?'en':'es');protected readonly busy=computed(()=>this.loadState.busy()||this.detailState.busy());
 protected readonly customers=signal<AdminCustomer[]>([]);protected readonly selected=signal<AdminCustomer|null>(null);protected readonly pagination=signal({current_page:1,last_page:1,total:0});
 @ViewChild('details',{static:true})protected details!:DialogComponent;
 ngOnInit():void{void this.loadPage(1);}
 protected async loadPage(page:number):Promise<void>{if(this.busy()||!Number.isSafeInteger(page)||page<1)return;await this.request(this.loadState,async token=>{let response=await this.api.getAdminCustomers(page);if(response.data.meta.current_page>response.data.meta.last_page)response=await this.api.getAdminCustomers(response.data.meta.last_page);if(this.session.token!==token)return;this.customers.set(response.data.data);this.pagination.set(response.data.meta);});}
 protected async show(customer:AdminCustomer):Promise<void>{if(this.busy())return;this.selected.set(null);this.details.open();await this.request(this.detailState,async token=>{const {data}=await this.api.getAdminCustomer(customer.user_id);if(this.session.token===token)this.selected.set(data.data);});}
 private async request(state:ApiFormState,work:(token:string|null)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(token));if([401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
}
