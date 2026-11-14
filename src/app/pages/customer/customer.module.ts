import '@angular/common/locales/global/es';
import {ReactiveFormsModule} from '@angular/forms';
import {CatalogComponent} from './catalog.component';
import {CustomerOrdersComponent} from './orders.component';
import {PaymentComponent} from './payment.component';
import {PointsComponent} from './points.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CustomerLayoutComponent } from '../../layouts/customer-layout/customer-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [CustomerLayoutComponent,CatalogComponent,CustomerOrdersComponent,PaymentComponent,PointsComponent],
  imports: [
    CommonModule, SharedModule, ReactiveFormsModule,
    RouterModule.forChild([{
      path: '',
      component: CustomerLayoutComponent,children:[{path:'',component:CatalogComponent},{path:'restaurants/:restaurantId',component:CatalogComponent},{path:'orders',component:CustomerOrdersComponent},{path:'orders/:orderId',component:CustomerOrdersComponent},{path:'points',component:PointsComponent}],
    }]),
  ],
})
export class CustomerModule {}
