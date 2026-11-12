import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CustomerLayoutComponent } from '../../layouts/customer-layout/customer-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [CustomerLayoutComponent],
  imports: [
    CommonModule, SharedModule,
    RouterModule.forChild([{
      path: '',
      component: CustomerLayoutComponent,
    }]),
  ],
})
export class CustomerModule {}
