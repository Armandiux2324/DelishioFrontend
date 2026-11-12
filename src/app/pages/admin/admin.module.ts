import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminLayoutComponent } from '../../layouts/admin-layout/admin-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [AdminLayoutComponent],
  imports: [
    CommonModule, SharedModule,
    RouterModule.forChild([{
      path: '',
      component: AdminLayoutComponent,
    }]),
  ],
})
export class AdminModule {}
