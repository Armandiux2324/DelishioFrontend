import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';
import { RegisterComponent } from './register/register.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { ForgotPasswordComponent } from './recovery/forgot-password.component';
import { ResetPasswordComponent } from './recovery/reset-password.component';
import { LoginComponent } from './login/login.component';

@NgModule({
  declarations: [AuthLayoutComponent, LoginComponent, RegisterComponent, VerifyEmailComponent, ForgotPasswordComponent, ResetPasswordComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, SharedModule,
    RouterModule.forChild([{
      path: '', component: AuthLayoutComponent,
      children: [
        { path: '', pathMatch: 'full', redirectTo: 'login' },
        { path: 'login', component: LoginComponent },
        { path: 'register', component: RegisterComponent },
        { path: 'verify-email', component: VerifyEmailComponent },
        { path: 'forgot-password', component: ForgotPasswordComponent },
        { path: 'reset-password', component: ResetPasswordComponent },
      ],
    }]),
  ],
})
export class AuthModule {}
