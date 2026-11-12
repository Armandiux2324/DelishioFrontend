import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';
import { LoginComponent } from './login/login.component';

@NgModule({
  declarations: [AuthLayoutComponent, LoginComponent],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild([{
      path: '', component: AuthLayoutComponent,
      children: [{ path: '', component: LoginComponent }],
    }]),
  ],
})
export class AuthModule {}
