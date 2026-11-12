import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./pages/auth/auth.module').then(module => module.AuthModule),
  },
  {
    path: 'super-admin', canActivate: [authGuard], canActivateChild: [roleGuard],
    data: { roles: ['super_admin'] },
    loadChildren: () => import('./pages/super-admin/super-admin.module').then(module => module.SuperAdminModule),
  },
  {
    path: 'admin', canActivate: [authGuard], canActivateChild: [roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./pages/admin/admin.module').then(module => module.AdminModule),
  },
  {
    path: 'mesero', canActivate: [authGuard], canActivateChild: [roleGuard],
    data: { roles: ['waiter'] },
    loadChildren: () => import('./pages/waiter/waiter.module').then(module => module.WaiterModule),
  },
  {
    path: 'chef', canActivate: [authGuard], canActivateChild: [roleGuard],
    data: { roles: ['chef'] },
    loadChildren: () => import('./pages/chef/chef.module').then(module => module.ChefModule),
  },
  {
    path: 'cliente', canActivate: [authGuard], canActivateChild: [roleGuard],
    data: { roles: ['customer'] },
    loadChildren: () => import('./pages/customer/customer.module').then(module => module.CustomerModule),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
