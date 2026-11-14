
import {Injectable} from '@angular/core';
import {CustomerOrderInput} from './customer.models';
export interface CustomerOrderAttempt{key:string;payload:CustomerOrderInput}
@Injectable({providedIn:'root'})
export class CustomerOrderAttemptService {
 private readonly memory=new Map<string,CustomerOrderAttempt>();
 private key(user:number,restaurant:number){return 'delishio.order-attempt.'+user+'.'+restaurant;}
 read(user:number,restaurant:number):CustomerOrderAttempt|null{const key=this.key(user,restaurant);try{const raw=sessionStorage.getItem(key);if(raw){const value=JSON.parse(raw) as CustomerOrderAttempt;if(typeof value.key==='string'&&/^[0-9a-f-]{36}$/i.test(value.key)&&value.payload?.service_type==='takeout'&&Array.isArray(value.payload.items)&&value.payload.items.length>0&&value.payload.items.length<=100&&value.payload.items.every(item=>Number.isSafeInteger(item.menu_item_id)&&Number.isSafeInteger(item.quantity)&&item.quantity>0&&item.quantity<=2147483647&&[item.modifiers,item.kitchen_notes].every(text=>text===null||typeof text==='string')))return value;sessionStorage.removeItem(key);}}catch{ /* Keep in-memory recovery when browser storage is unavailable. */ }return this.memory.get(key)??null;}
 save(user:number,restaurant:number,payload:CustomerOrderInput):CustomerOrderAttempt{const key=this.key(user,restaurant);const attempt={key:crypto.randomUUID(),payload:structuredClone(payload)};this.memory.set(key,attempt);try{sessionStorage.setItem(key,JSON.stringify(attempt));}catch{}return attempt;}
 clear(user:number,restaurant:number):void{const key=this.key(user,restaurant);this.memory.delete(key);try{sessionStorage.removeItem(key);}catch{}}
}
