
import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,OnInit,signal} from '@angular/core';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {TaxAssociationsPage} from '../../../services/tax-associations.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {taxAssociationsCopy} from './tax-associations-copy';
@Component({selector:'app-tax-associations',standalone:false,templateUrl:'./tax-associations.component.html',styleUrl:'./tax-associations.component.scss'})
export class TaxAssociationsComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly document=inject(DOCUMENT);private readonly zone=inject(NgZone);private destroyed=false;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=taxAssociationsCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly exportState=new ApiFormState(()=>this.locale);protected readonly data=signal<TaxAssociationsPage|null>(null);
 ngOnInit():void{void this.load(1);}ngOnDestroy():void{this.destroyed=true;}
 protected busy(){return this.state.busy()||this.exportState.busy();}
 protected async load(page=this.data()?.meta.current_page??1):Promise<void>{if(this.destroyed||this.busy()||!Number.isSafeInteger(page)||page<1)return;this.exportState.success.set('');this.exportState.error.set(null);await this.run(this.state,async current=>{let {data}=await this.api.getTaxAssociationsReport(page);if(!current())return;if(data.meta.current_page>data.meta.last_page){const response=await this.api.getTaxAssociationsReport(data.meta.last_page);data=response.data;}if(current())this.data.set(data);});}
 protected async download():Promise<void>{if(this.destroyed||this.busy()||!this.data())return;await this.run(this.exportState,async current=>{const response=await this.api.exportTaxAssociationsReport();if(!current())return;const blob=response.data;if(!(blob instanceof Blob)||!blob.size||blob.type.split(';')[0]!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')throw Error('Invalid workbook response');const url=URL.createObjectURL(blob),anchor=this.document.createElement('a');anchor.href=url;anchor.download='tax-associations.xlsx';this.document.body.appendChild(anchor);try{anchor.click();this.exportState.success.set(this.text.downloaded);}finally{anchor.remove();this.zone.runOutsideAngular(()=>setTimeout(()=>URL.revokeObjectURL(url),1000));}});}
 private async run(state:ApiFormState,work:(current:()=>boolean)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(()=>!this.destroyed&&this.session.token===token));if(!this.destroyed&&[401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();this.data.set(null);await this.router.navigate(['/login']);}}
}
