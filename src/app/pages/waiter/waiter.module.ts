import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WaiterLayoutComponent } from '../../layouts/waiter-layout/waiter-layout.component';
import { SharedModule } from '../../shared/shared.module';
import { PrebillComponent } from './prebill.component';

@NgModule({
  declarations: [WaiterLayoutComponent, PrebillComponent],
  imports: [
    CommonModule, SharedModule, FormsModule,
    RouterModule.forChild([{
      path: '',
      component: WaiterLayoutComponent,
      children: [{ path: '', component: PrebillComponent }],
    }]),
  ],
})
export class WaiterModule {}
