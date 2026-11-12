import { MenuComponent } from './menu/menu.component';
import { InventoryComponent } from './inventory/inventory.component';
import { CatalogComponent } from './catalog/catalog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SettingsComponent } from './settings/settings.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminLayoutComponent } from '../../layouts/admin-layout/admin-layout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [AdminLayoutComponent, SettingsComponent, CatalogComponent, InventoryComponent, MenuComponent],
  imports: [
    CommonModule, SharedModule, ReactiveFormsModule,
    RouterModule.forChild([{
      path: '',
      component: AdminLayoutComponent,
      children: [
        { path: 'settings', component: SettingsComponent },
        { path: 'menu', component: MenuComponent },
        { path: 'inventory', pathMatch: 'full', redirectTo: 'inventory/items' },
        { path: 'inventory/items', component: InventoryComponent },
        { path: 'inventory/losses', component: InventoryComponent, data: { losses: true } },
        { path: 'catalog', pathMatch: 'full', redirectTo: 'catalog/tax-classes' },
        ...(['tax-classes', 'super-categories', 'categories'] as const).map(kind => ({
          path: 'catalog/' + kind, component: CatalogComponent, data: { catalogKind: kind },
        })),
      ],
    }]),
  ],
})
export class AdminModule {}
