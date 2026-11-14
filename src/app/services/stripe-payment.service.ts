import {Injectable} from '@angular/core';
import {loadStripe} from '@stripe/stripe-js/pure';
@Injectable({providedIn:'root'})
export class StripePaymentService{load(key:string,account:string){return loadStripe(key,{stripeAccount:account});}}
