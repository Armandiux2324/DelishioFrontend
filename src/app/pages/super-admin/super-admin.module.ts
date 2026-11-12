import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SuperAdminLayoutComponent } from '../../layouts/super-admin-layout/super-admin-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [SuperAdminLayoutComponent],
  imports: [
    CommonModule, SharedModule,
    RouterModule.forChild([{
      path: '',
      component: SuperAdminLayoutComponent,
    }]),
  ],
})
export class SuperAdminModule {}
