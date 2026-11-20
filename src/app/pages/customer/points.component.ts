import {Subscription} from 'rxjs';

import {Component,inject,OnDestroy,OnInit,signal} from '@angular/core';
import {Router} from '@angular/router';
import {ApiService} from '../../services/api.service';
import {SessionService} from '../../services/session.service';
import {CustomerBalance} from '../../services/customer.models';
import {ApiFormState} from '../../shared/forms/api-form-state';
import {customerCopy} from './customer-copy';
@Component({selector:'app-customer-points',standalone:false,templateUrl:'./points.component.html',styleUrl:'./customer.component.scss'})
export class PointsComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private destroyed=false;private sessionSubscription?:Subscription;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=customerCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly balances=signal<CustomerBalance[]>([]);protected readonly qr=signal('');protected readonly pagination=signal({current_page:1,last_page:1,total:0});
 ngOnInit():void{const token=this.session.token;this.sessionSubscription=this.session.session$.subscribe(()=>{if(this.session.token!==token){this.qr.set('');this.balances.set([]);}});void this.load(1);}ngOnDestroy():void{this.destroyed=true;this.sessionSubscription?.unsubscribe();}
 protected async load(page:number):Promise<void>{if(this.state.busy()||!Number.isSafeInteger(page)||page<1)return;const token=this.session.token;await this.state.run(async()=>{const [balanceResponse,userResponse]=await Promise.all([this.api.getCustomerBalances(page),this.api.getUser()]);if(this.destroyed||this.session.token!==token)return;const data=balanceResponse.data;this.balances.set(data.data);this.pagination.set({current_page:data.current_page,last_page:data.last_page,total:data.total});this.qr.set(userResponse.data.customer?.qr_code??'');});if(!this.destroyed&&[401,403].includes(this.state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
}
