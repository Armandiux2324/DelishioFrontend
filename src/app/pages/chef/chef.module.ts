import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChefLayoutComponent } from '../../layouts/chef-layout/chef-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [ChefLayoutComponent],
  imports: [
    CommonModule, SharedModule,
    RouterModule.forChild([{
      path: '',
      component: ChefLayoutComponent,
    }]),
  ],
})
export class ChefModule {}
