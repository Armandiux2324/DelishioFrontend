import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mesero' },
  { path: 'mesero', loadComponent: () => import('./waiter/prebill.component').then(m => m.PrebillComponent) },
];
