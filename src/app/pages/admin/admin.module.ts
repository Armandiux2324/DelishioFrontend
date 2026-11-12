import { ReactiveFormsModule } from '@angular/forms';
import { SettingsComponent } from './settings/settings.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminLayoutComponent } from '../../layouts/admin-layout/admin-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [AdminLayoutComponent, SettingsComponent],
  imports: [
    CommonModule, SharedModule, ReactiveFormsModule,
    RouterModule.forChild([{
      path: '',
      component: AdminLayoutComponent,
      children: [{ path: 'settings', component: SettingsComponent }],
    }]),
  ],
})
export class AdminModule {}
