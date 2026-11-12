import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Category } from '../../../services/catalog.models';
import { InventoryItem } from '../../../services/inventory.models';
import { MenuItem, MenuItemPayload, PreparationStation, RecipeIngredient } from '../../../services/menu-item.models';
import { SessionService } from '../../../services/session.service';
import { DialogComponent } from '../../../shared/dialog/dialog.component';
import { ApiFormState } from '../../../shared/forms/api-form-state';
import { menuCopy } from './menu-copy';

const httpUrl = (control: AbstractControl) => {
 if (!control.value) return null;
 try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; } catch { return { url: true }; }
};
const duplicateIngredients = (control: AbstractControl) => {
 const ids = (control.value as {inventory_item_id: string}[]).map(row => row.inventory_item_id).filter(Boolean);
 return new Set(ids).size === ids.length ? null : { duplicate: true };
};
const canonicalRecipe = (rows: RecipeIngredient[]) => JSON.stringify([...rows].sort((a,b) => a.inventory_item_id - b.inventory_item_id));

@Component({selector:'app-menu-items',standalone:false,templateUrl:'./menu.component.html',styleUrl:'./menu.component.scss'})
export class MenuComponent implements OnInit {
 private readonly api = inject(ApiService);
 private readonly session = inject(SessionService);
 private readonly router = inject(Router);
 private readonly builder = inject(NonNullableFormBuilder);
 protected readonly locale = this.session.user?.locale === 'en' ? 'en' : 'es';
 protected readonly text = menuCopy[this.locale];
 protected readonly stations: PreparationStation[] = ['none','kitchen','bar'];
 protected readonly loadState = new ApiFormState(() => this.locale);
 protected readonly actionState = new ApiFormState(() => this.locale);
 protected readonly busy = computed(() => this.loadState.busy() || this.actionState.busy());
 protected readonly items = signal<MenuItem[]>([]);
 protected readonly categories = signal<Category[]>([]);
 protected readonly inventory = signal<InventoryItem[]>([]);
 protected readonly selected = signal<MenuItem | null>(null);
 protected readonly ready = signal(false);
 protected readonly notice = signal('');
 protected readonly pagination = signal({current_page:1,last_page:1,total:0});
 protected readonly recipe = this.builder.array<ReturnType<MenuComponent['recipeRow']>>([], duplicateIngredients);
 protected readonly form = this.builder.group({
  name:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(255)]],
  category_id:['',[Validators.required,Validators.pattern(/^[1-9]\d*$/)]],
  sale_price:['',[Validators.required,Validators.pattern(/^\d+(?:\.\d{1,2})?$/),Validators.min(0),Validators.max(99999999.99)]],
  description:['',(control:AbstractControl)=>new TextEncoder().encode(control.value).length>65535?{bytes:true}:null],
  image_url:['',[httpUrl,Validators.maxLength(255)]],
  legal_age_required:false, preparation_station:this.builder.control<PreparationStation>('none',[Validators.required,Validators.pattern(/^(none|kitchen|bar)$/)]), active:true,
  ingredients:this.recipe,
 });
 @ViewChild('editor',{static:true}) protected editor!:DialogComponent;
 @ViewChild('confirmation',{static:true}) protected confirmation!:DialogComponent;
 @ViewChild('addButton',{static:true}) private addButton!:ElementRef<HTMLButtonElement>;
 ngOnInit():void { void this.loadPage(1); }
 protected async loadPage(page:number):Promise<void> {
  if(this.busy() || !Number.isSafeInteger(page) || page<1)return;
  await this.request(this.loadState,async token=>{
   let [response,categories]=await Promise.all([this.api.getMenuItems(page),this.loadCategories()]);
   if(response.data.meta.current_page>response.data.meta.last_page)response=await this.api.getMenuItems(response.data.meta.last_page);
   if(this.session.token!==token)return;
   this.items.set(response.data.data);this.categories.set(categories);this.pagination.set(response.data.meta);
  });
 }
 protected categoryName(id:number):string {return this.categories().find(row=>row.id===id)?.name??this.text.category+' #'+id;}
 protected ingredientUnit(id:string):string {return this.inventory().find(row=>row.id===Number(id))?.unit??'';}
 protected async openEditor(item?:MenuItem):Promise<void> {
  if(this.busy())return;
  this.notice.set('');this.ready.set(false);this.selected.set(item??null);this.editor.open();
  await this.request(this.actionState,async token=>{
   const [response,categories,inventory]=await Promise.all([item?this.api.getMenuItem(item.id):Promise.resolve(null),this.loadCategories(),this.loadInventory()]);
   if(this.session.token!==token)return;
   const fresh=response?.data.data??null;this.selected.set(fresh);this.categories.set(categories);this.inventory.set(inventory);
   this.recipe.clear();
   this.form.reset({name:fresh?.name??'',category_id:fresh?String(fresh.category_id):'',sale_price:fresh?.sale_price??'',description:fresh?.description??'',image_url:fresh?.image_url??'',legal_age_required:fresh?.legal_age_required??false,preparation_station:fresh?.preparation_station??'none',active:fresh?.active??true});
   for(const row of fresh?.ingredients??[])this.recipe.push(this.recipeRow(row));
   this.form.markAsPristine();this.ready.set(true);
  });
 }
 protected addIngredient():void {if(!this.busy()){this.recipe.push(this.recipeRow());this.recipe.markAsDirty();}}
 protected removeIngredient(index:number):void {if(!this.busy()){this.recipe.removeAt(index);this.recipe.markAsDirty();}}
 private recipeRow(row?:RecipeIngredient){return this.builder.group({
  inventory_item_id:[row?String(row.inventory_item_id):'',[Validators.required,Validators.pattern(/^[1-9]\d*$/)]],
  quantity:[row?.quantity??'',[Validators.required,Validators.pattern(/^\d+(?:\.\d{1,3})?$/),Validators.min(0.001),Validators.max(999999999.999)]],
 });}
 protected async save():Promise<void> {
  if(this.busy()||!this.ready())return;
  if(!this.categories().some(row=>row.id===Number(this.form.controls.category_id.value)))this.form.controls.category_id.setErrors({unavailable:true});
  for(const row of this.recipe.controls)if(!this.inventory().some(item=>item.id===Number(row.controls.inventory_item_id.value)))row.controls.inventory_item_id.setErrors({unavailable:true});
  if(this.form.invalid){this.form.markAllAsTouched();return;}
  const value=this.form.getRawValue();
  const payload:MenuItemPayload={...value,name:value.name.trim(),category_id:Number(value.category_id),description:value.description.trim()||null,image_url:value.image_url.trim()||null,
   ingredients:value.ingredients.map(row=>({inventory_item_id:Number(row.inventory_item_id),quantity:row.quantity}))};
  const selected=this.selected();let saved=false;
  await this.request(this.actionState,async token=>{
   if(selected){
    const changes:Partial<MenuItemPayload>=Object.fromEntries(Object.entries(payload).filter(([key,entry])=>key!=='ingredients'&&entry!==selected[key as keyof MenuItemPayload]));
    if(canonicalRecipe(payload.ingredients)!==canonicalRecipe(selected.ingredients))changes.ingredients=payload.ingredients;
    if(Object.keys(changes).length)await this.api.updateMenuItem(selected.id,changes);
   }else await this.api.createMenuItem(payload);
   if(this.session.token!==token)return;
   this.editor.close();this.notice.set(selected?this.text.updated:this.text.created);saved=true;
  });
  if(saved)await this.reload();
 }
 protected prepareDelete(item:MenuItem):void {if(this.busy())return;this.selected.set(item);this.notice.set('');this.actionState.error.set(null);this.confirmation.open();}
 protected async remove():Promise<void>{
  const item=this.selected();if(this.busy()||!item)return;let removed=false;
  await this.request(this.actionState,async token=>{await this.api.deleteMenuItem(item.id);if(this.session.token!==token)return;this.confirmation.close();this.notice.set(this.text.deleted);removed=true;});
  if(removed)await this.reload();
 }
 private async reload():Promise<void>{await this.loadPage(this.pagination().current_page);this.addButton.nativeElement.focus();}
 private async loadCategories():Promise<Category[]>{const rows:Category[]=[];let page=1,last=1;do{const {data}=await this.api.getCatalog('categories',page);rows.push(...data.data);last=data.meta.last_page;page++;}while(page<=last);return rows;}
 private async loadInventory():Promise<InventoryItem[]>{const rows:InventoryItem[]=[];let page=1,last=1;do{const {data}=await this.api.getInventoryItems(page);rows.push(...data.data);last=data.meta.last_page;page++;}while(page<=last);return rows;}
 private async request(state:ApiFormState,work:(token:string|null)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(token));if([401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
}
