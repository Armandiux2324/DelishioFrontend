
import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,OnInit,signal} from '@angular/core';
import {Router} from '@angular/router';
import {ApiService} from '../../services/api.service';
import {SessionService} from '../../services/session.service';
import {ChefQueueItem,PreparationStatus} from '../../services/chef-queue.models';
import {ApiFormState} from '../../shared/forms/api-form-state';
import {queueCopy} from './queue-copy';
@Component({selector:'app-chef-queue',standalone:false,templateUrl:'./queue.component.html',styleUrl:'./queue.component.scss'})
export class QueueComponent implements OnInit,OnDestroy {
 private readonly zone=inject(NgZone);private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly document=inject(DOCUMENT);
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=queueCopy[this.locale];protected readonly station=this.session.user?.employee?.station;
 protected readonly state=new ApiFormState(()=>this.locale);protected readonly actionState=new ApiFormState(()=>this.locale);
 protected readonly rows=signal<ChefQueueItem[]>([]);protected readonly filter=signal<PreparationStatus|'active'>('active');protected readonly filters:('active'|PreparationStatus)[]=['active','pending','in_preparation','ready'];
 protected readonly pagination=signal({current_page:1,last_page:1,total:0});protected readonly loaded=signal(false);protected readonly lastSync=signal<Date|null>(null);protected readonly tv=signal(false);protected readonly notice=signal('');
 protected readonly tvOffset=signal(0);private tvTicks=0;
 private timer:ReturnType<typeof setTimeout>|undefined;private destroyed=false;private denied=false;
 private readonly visibility=()=>{if(this.document.hidden)this.stopTimer();else void this.load();};
 ngOnInit():void{this.document.addEventListener('visibilitychange',this.visibility);void this.load();}
 ngOnDestroy():void{this.destroyed=true;this.stopTimer();this.document.removeEventListener('visibilitychange',this.visibility);}
 protected visibleRows():ChefQueueItem[]{return this.tv()?this.rows().slice(this.tvOffset(),this.tvOffset()+4):this.rows();}
 protected screens():number{return Math.max(1,Math.ceil(this.rows().length/4));}
 protected screen():number{return Math.floor(this.tvOffset()/4)+1;}
 protected toggleTv():void{this.tv.update(value=>!value);this.tvOffset.set(0);this.tvTicks=0;this.schedule();}
 protected busy():boolean{return this.state.busy()||this.actionState.busy();}
 protected async select(filter:'active'|PreparationStatus):Promise<void>{if(this.busy()||filter===this.filter())return;this.tvOffset.set(0);this.tvTicks=0;this.filter.set(filter);this.rows.set([]);this.loaded.set(false);this.lastSync.set(null);await this.load(1);}
 protected async load(page=this.pagination().current_page):Promise<void>{if(this.destroyed||this.denied||this.busy()||this.document.hidden||!Number.isSafeInteger(page)||page<1)return;this.stopTimer();if(page!==this.pagination().current_page)this.tvOffset.set(0);const token=this.session.token;await this.state.run(async()=>{const status=this.filter()==='active'?undefined:this.filter() as PreparationStatus;let {data}=await this.api.getChefQueue(page,status);if(this.destroyed||this.session.token!==token)return;if(data.meta.current_page>data.meta.last_page){const response=await this.api.getChefQueue(data.meta.last_page,status);data=response.data;}if(this.destroyed||this.session.token!==token)return;this.rows.set(data.data);if(this.tvOffset()>=data.data.length)this.tvOffset.set(0);this.pagination.set(data.meta);this.loaded.set(true);this.lastSync.set(new Date());});await this.checkAccess(this.state,token);this.schedule();}
 protected async advance(item:ChefQueueItem):Promise<void>{if(this.destroyed||this.denied||this.busy()||this.tv()||this.state.error()||!this.rows().some(row=>row.id===item.id&&row.status===item.status)||item.status==='ready')return;this.stopTimer();this.notice.set('');const token=this.session.token;const next=item.status==='pending'?'in_preparation':'ready';await this.actionState.run(async()=>{const {data}=await this.api.updateChefQueueItem(item.id,next);if(this.destroyed||this.session.token!==token)return;const updated=data.data;this.rows.update(rows=>rows.flatMap(row=>row.id!==updated.id?[row]:(this.filter()==='active'?updated.status!=='ready':updated.status===this.filter())?[updated]:[]));this.notice.set(this.text.saved);});await this.checkAccess(this.actionState,token);if(!this.destroyed&&!this.denied&&this.session.token===token)await this.load();}
 private stopTimer():void{clearTimeout(this.timer);this.timer=undefined;}
 private schedule():void{this.stopTimer();if(!this.destroyed&&!this.denied&&!this.document.hidden)this.zone.runOutsideAngular(()=>{this.timer=setTimeout(()=>this.zone.run(()=>{let page=this.pagination().current_page;if(this.tv()&&++this.tvTicks>=3){this.tvTicks=0;if(this.tvOffset()+4<this.rows().length)this.tvOffset.update(value=>value+4);else{this.tvOffset.set(0);page=page<this.pagination().last_page?page+1:1;}}void this.load(page);}),5000);});}
 private async checkAccess(state:ApiFormState,token:string|null):Promise<void>{if(this.destroyed)return;if(this.session.token!==token&&!([401,403].includes(state.error()?.status??0)&&this.session.token===null)){this.denied=true;this.rows.set([]);return;}if([401,403].includes(state.error()?.status??0)){this.denied=true;this.rows.set([]);this.session.clear();await this.router.navigate(['/login']);}}
}
