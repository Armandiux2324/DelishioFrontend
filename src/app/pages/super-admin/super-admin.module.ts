import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RestaurantsComponent } from './restaurants/restaurants.component';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SuperAdminLayoutComponent } from '../../layouts/super-admin-layout/super-admin-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [SuperAdminLayoutComponent, RestaurantsComponent],
  imports: [
    CommonModule, SharedModule, ReactiveFormsModule,
    RouterModule.forChild([{
      path: '',
      component: SuperAdminLayoutComponent,
      children: [{ path: '', component: RestaurantsComponent }],
    }]),
  ],
})
export class SuperAdminModule {}
