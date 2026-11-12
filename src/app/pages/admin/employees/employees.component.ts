import {Component,computed,ElementRef,inject,OnDestroy,OnInit,signal,ViewChild} from '@angular/core';
import {AbstractControl,NonNullableFormBuilder,Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {ApiService} from '../../../services/api.service';
import {Employee,EmployeeCreate,EmployeeFields,EmployeeRole,EmployeeStation,EmployeeUpdate} from '../../../services/employee.models';
import {SessionService} from '../../../services/session.service';
import {DialogComponent} from '../../../shared/dialog/dialog.component';
import {ApiFormState} from '../../../shared/forms/api-form-state';
import {employeeCopy} from './employee-copy';

const matchingPasswords=(control:AbstractControl)=>control.get('password')?.value!==control.get('password_confirmation')?.value?{mismatch:true}:null;
@Component({selector:'app-employees',standalone:false,templateUrl:'./employees.component.html',styleUrl:'./employees.component.scss'})
export class EmployeesComponent implements OnInit,OnDestroy {
 private readonly api=inject(ApiService);private readonly session=inject(SessionService);private readonly router=inject(Router);private readonly builder=inject(NonNullableFormBuilder);
 protected get locale():'es'|'en'{return this.session.user?.locale==='en'?'en':'es';}
 protected get text(){return employeeCopy[this.locale];}
 protected readonly roles:EmployeeRole[]=['admin','waiter','chef'];protected readonly stations:EmployeeStation[]=['kitchen','bar'];
 protected readonly loadState=new ApiFormState(()=>this.locale);protected readonly actionState=new ApiFormState(()=>this.locale);
 protected readonly busy=computed(()=>this.loadState.busy()||this.actionState.busy());
 protected readonly employees=signal<Employee[]>([]);protected readonly selected=signal<Employee|null>(null);protected readonly ready=signal(false);protected readonly notice=signal('');protected readonly generatedPin=signal<string|null>(null);
 protected readonly pagination=signal({current_page:1,last_page:1,total:0});
 protected readonly form=this.builder.group({
  name:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(255)]],email:['',[Validators.required,Validators.email,Validators.maxLength(255)]],username:['',[Validators.pattern(/^[a-z0-9_-]*$/),Validators.maxLength(50)]],phone:['',Validators.maxLength(20)],
  locale:this.builder.control<'en'|'es'>('es',[Validators.required,Validators.pattern(/^(en|es)$/)]),role:this.builder.control<EmployeeRole>('waiter',[Validators.required,Validators.pattern(/^(admin|waiter|chef)$/)]),station:this.builder.control<EmployeeStation|''>('',[Validators.required,Validators.pattern(/^(kitchen|bar)$/)]),
  hourly_rate:['',[Validators.required,Validators.pattern(/^\d+(?:\.\d{1,2})?$/),Validators.min(0),Validators.max(999999.99)]],active:true,
  password:['',Validators.minLength(8)],password_confirmation:'',pin:['',Validators.pattern(/^[0-9]{4,6}$/)],
 },{validators:matchingPasswords});
 @ViewChild('editor',{static:true})protected editor!:DialogComponent;@ViewChild('confirmation',{static:true})protected confirmation!:DialogComponent;@ViewChild('pinSheet',{static:true})protected pinSheet!:DialogComponent;@ViewChild('addButton',{static:true})private addButton!:ElementRef<HTMLButtonElement>;
 ngOnInit():void{void this.loadPage(1);}
 ngOnDestroy():void{this.clearSecrets();this.generatedPin.set(null);}
 protected async loadPage(page:number):Promise<void>{if(this.busy()||!Number.isSafeInteger(page)||page<1)return;await this.request(this.loadState,async token=>{let response=await this.api.getEmployees(page);if(response.data.meta.current_page>response.data.meta.last_page)response=await this.api.getEmployees(response.data.meta.last_page);if(this.session.token!==token)return;this.employees.set(response.data.data);this.pagination.set(response.data.meta);});}
 protected async openEditor(employee?:Employee):Promise<void>{
  if(this.busy())return;this.notice.set('');this.ready.set(false);this.clearSecrets();this.selected.set(employee??null);this.editor.open();
  await this.request(this.actionState,async token=>{
   const fresh=employee?(await this.api.getEmployee(employee.user_id)).data.data:null;if(this.session.token!==token)return;this.selected.set(fresh);
   this.form.reset({name:fresh?.name??'',email:fresh?.email??'',username:fresh?.username??'',phone:fresh?.phone??'',locale:fresh?.locale??this.locale,role:fresh?.role??'waiter',station:fresh?.station??'',hourly_rate:fresh?.hourly_rate??'',active:fresh?.active??true,password:'',password_confirmation:'',pin:''});
   this.form.controls.password.setValidators(fresh?[Validators.minLength(8)]:[Validators.required,Validators.minLength(8)]);this.form.controls.password.updateValueAndValidity();this.updateRole();this.ready.set(true);
  });
 }
 protected updateRole():void{
  if(this.form.controls.role.value==='chef')this.form.controls.station.enable();else this.form.controls.station.disable();
  const promoted=this.selected()!==null&&this.selected()!.role!=='admin'&&this.form.controls.role.value==='admin';
  this.form.controls.pin.setValidators(promoted?[Validators.required,Validators.pattern(/^[0-9]{4,6}$/)]:[Validators.pattern(/^[0-9]{4,6}$/)]);this.form.controls.pin.updateValueAndValidity();
 }
 protected clearSecrets():void{this.form.controls.password.reset();this.form.controls.password_confirmation.reset();this.form.controls.pin.reset();}
 protected dismissPin():void{this.generatedPin.set(null);if(this.addButton?.nativeElement.isConnected)this.addButton.nativeElement.focus();}
 protected async save():Promise<void>{
  if(this.busy()||!this.ready())return;if(this.form.invalid){this.form.markAllAsTouched();return;}
  const value=this.form.getRawValue();const selected=this.selected();let saved=false;let redirect=false;
  const fields:EmployeeFields={name:value.name.trim(),email:value.email.trim().toLowerCase(),username:value.username||null,locale:value.locale,phone:value.phone.trim()||null,role:value.role,hourly_rate:value.hourly_rate,active:value.active,...(value.role==='chef'?{station:value.station as EmployeeStation}:{})};
  await this.request(this.actionState,async token=>{try{
   if(selected){
    const payload:EmployeeUpdate=Object.fromEntries(Object.entries(fields).filter(([key,entry])=>entry!==selected[key as keyof Employee]));
    if(value.password){payload.password=value.password;payload.password_confirmation=value.password_confirmation;}if(value.pin)payload.pin=value.pin;
    if(!Object.keys(payload).length){this.editor.close();return;}
    const {data}=await this.api.updateEmployee(selected.user_id,payload);if(this.session.token!==token)return;
    if(selected.user_id===this.session.user?.id){
     redirect=['username','email','password','active','pin','role','station'].some(key=>key in payload);
     if(!redirect&&token){const user=this.session.user!;this.session.start({access_token:token,user:{...user,name:data.data.name,email:data.data.email,username:data.data.username,locale:data.data.locale,employee:{...user.employee!,phone:data.data.phone,role:data.data.role}}});}
    }
    this.notice.set(this.text.updated);
   }else{
    const payload:EmployeeCreate={...fields,password:value.password,password_confirmation:value.password_confirmation,...(value.pin?{pin:value.pin}:{})};
    const {data}=await this.api.createEmployee(payload);if(this.session.token!==token)return;
    this.generatedPin.set(data.meta?.generated_pin??null);this.notice.set(this.text.created);
   }
   this.editor.close();saved=true;
  }finally{this.clearSecrets();}});
  if(redirect){this.session.clear();await this.router.navigate(['/login']);return;}
  if(saved){if(this.generatedPin())this.pinSheet.open();await this.loadPage(this.pagination().current_page);if(!this.generatedPin())this.addButton.nativeElement.focus();}
 }
 protected prepareDelete(employee:Employee):void{if(this.busy())return;this.notice.set('');this.selected.set(employee);this.actionState.error.set(null);this.confirmation.open();}
 protected async remove():Promise<void>{const selected=this.selected();if(this.busy()||!selected)return;let removed=false;await this.request(this.actionState,async token=>{await this.api.deleteEmployee(selected.user_id);if(this.session.token!==token)return;this.confirmation.close();this.notice.set(this.text.deleted);removed=true;});if(removed){if(selected.user_id===this.session.user?.id){this.session.clear();await this.router.navigate(['/login']);}else{await this.loadPage(this.pagination().current_page);this.addButton.nativeElement.focus();}}}
 private async request(state:ApiFormState,work:(token:string|null)=>Promise<void>):Promise<void>{const token=this.session.token;await state.run(()=>work(token));if([401,403].includes(state.error()?.status??0)&&(this.session.token===token||this.session.token===null)){this.session.clear();await this.router.navigate(['/login']);}}
}
