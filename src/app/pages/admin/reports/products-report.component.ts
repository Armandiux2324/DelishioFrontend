
import {DOCUMENT} from '@angular/common';
import {Component,inject,NgZone,OnDestroy,OnInit,signal} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {SessionService} from '../../../services/session.service';
import {ProductsReportData,ProductsReportFilter} from '../../../services/products-report.models';
import {CatalogRecords,Category,SuperCategory} from '../../../services/catalog.models';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {productsReportCopy} from './products-report-copy';
const xlsxType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function date(control:AbstractControl){const value=String(control.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return {date:true};const parsed=new Date(value+'T00:00:00Z');return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value?{date:true}:null;}
@Component({selector:'app-products-report',standalone:false,templateUrl:'./products-report.component.html',styleUrl:'./products-report.component.scss'})
export class ProductsReportComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly builder=inject(NonNullableFormBuilder);private readonly document=inject(DOCUMENT);private readonly zone=inject(NgZone);private destroyed=false;
 protected readonly locale=this.session.user?.locale==='en'?'en':'es';protected readonly text=productsReportCopy[this.locale];protected readonly state=new ApiFormState(()=>this.locale);protected readonly exportState=new ApiFormState(()=>this.locale);protected readonly data=signal<ProductsReportData|null>(null);protected readonly currency=signal<'USD'|'MXN'>('USD');
 protected readonly fields=['gross_sales','discount_total','loyalty_redeemed_amount','returns_amount','returns_tax_amount','net_sales','tax_total','total_sales'] as const;
 protected readonly catalogState=new ApiFormState(()=>this.locale);protected readonly categories=signal<Category[]>([]);protected readonly superCategories=signal<SuperCategory[]>([]);
 protected readonly form=this.builder.group({from:['',[Validators.required,date]],to:['',[Validators.required,date]],super_category_id:this.builder.control<number|null>(null),category_id:this.builder.control<number|null>(null),modifier:['',[Validators.maxLength(255)]]},{validators:control=>{const from=control.get('from'),to=control.get('to');return from?.valid&&to?.valid&&from.value>to.value?{range:true}:null;}});
 ngOnInit():void{void this.loadCatalog();}
 protected visibleCategories(){const id=this.form.controls.super_category_id.value;return this.categories().filter(row=>id===null||row.super_category_id===id);}
 protected changeSuper():void{if(!this.visibleCategories().some(row=>row.id===this.form.controls.category_id.value))this.form.controls.category_id.setValue(null);}
 protected superName(id:number|string){return this.superCategories().find(row=>String(row.id)===String(id))?.name??'#'+id;}
 protected categoryName(id:number|string){return this.categories().find(row=>String(row.id)===String(id))?.name??'#'+id;}
 protected async loadCatalog():Promise<void>{if(this.destroyed||this.busy())return;await this.run(this.catalogState,async current=>{const [supers,categories]=await Promise.all([this.catalogRows('super-categories',current),this.catalogRows('categories',current)]);if(current()){this.superCategories.set(supers);this.categories.set(categories);}});}
 private async catalogRows<K extends 'super-categories'|'categories'>(kind:K,current:()=>boolean):Promise<CatalogRecords[K][]>{const rows:CatalogRecords[K][]=[];let page=1,last=1;do{if(!current())return [];const {data}=await this.api.getCatalog(kind,page);rows.push(...data.data);last=data.meta.last_page;page++;}while(page<=last);return rows;}
 ngOnDestroy():void{this.destroyed=true;}
 protected busy(){return this.state.busy()||this.exportState.busy()||this.catalogState.busy();}
 protected async load():Promise<void>{if(this.destroyed||this.busy())return;if(this.form.invalid){this.form.markAllAsTouched();return;}const values=this.form.getRawValue();const filter:ProductsReportFilter={from:values.from,to:values.to,...(values.super_category_id!==null?{super_category_id:values.super_category_id}:{}),...(values.category_id!==null?{category_id:values.category_id}:{}),...(values.modifier.trim()?{modifier:values.modifier}:{})};this.exportState.success.set('');this.exportState.error.set(null);await this.run(this.state,async current=>{const [report,settings]=await Promise.all([this.api.getProductsReport(filter),this.api.getRestaurantSettings()]);if(current()){this.currency.set(settings.data.data.currency);this.data.set(report.data.data);}});}
 protected async download():Promise<void>{const report=this.data();if(this.destroyed||this.busy()||!report)return;const filter={...report.filters};await this.run(this.exportState,async current=>{const response=await this.api.exportProductsReport(filter);if(!current())return;const blob=response.data;if(!(blob instanceof Blob)||!blob.size||blob.type.split(';')[0]!==xlsxType)throw Error('Invalid workbook response');const url=URL.createObjectURL(blob);const anchor=this.document.createElement('a');anchor.href=url;anchor.download='products_'+filter.from+'_'+filter.to+'.xlsx';this.document.body.appendChild(anchor);try{anchor.click();this.exportState.success.set(this.text.downloaded);}finally{anchor.remove();this.zone.runOutsideAngular(()=>setTimeout(()=>URL.revokeObjectURL(url),1000));}});}
 private async run(state:ApiFormState,work:(current:()=>boolean)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(()=>!this.destroyed&&this.session.token===token));if(!this.destroyed&&[401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();this.data.set(null);await this.router.navigate(['/login']);}}
}
