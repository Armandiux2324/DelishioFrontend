import {CourtesiesComponent} from './reports/courtesies.component';
import {ProductsReportComponent} from './reports/products-report.component';
import {SalesSummaryComponent} from './reports/sales-summary.component';
import {TaxAssociationsComponent} from './reports/tax-associations.component';
import {OrdersReportComponent} from './reports/orders-report.component';
import {PaymentTransactionsComponent} from './reports/payment-transactions.component';
import '@angular/common/locales/global/es';
import {DashboardComponent} from './dashboard/dashboard.component';
import {ExternalSalesComponent} from '../operations/external-sales.component';
import { OperationsModule } from '../operations/operations.module';
import { ShiftsComponent } from '../operations/shifts.component';
import { CashRegistersComponent } from '../operations/cash-registers.component';
import { CashMovementsComponent } from '../operations/cash-movements.component';
import { CustomersComponent } from './customers/customers.component';
import { PromotionsComponent } from './promotions/promotions.component';
import { EmployeesComponent } from './employees/employees.component';
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
  declarations: [CourtesiesComponent,ProductsReportComponent,SalesSummaryComponent,TaxAssociationsComponent,OrdersReportComponent,PaymentTransactionsComponent,DashboardComponent, AdminLayoutComponent, SettingsComponent, CatalogComponent, InventoryComponent, MenuComponent, EmployeesComponent, CustomersComponent, PromotionsComponent],
  imports: [
    CommonModule, SharedModule, OperationsModule, ReactiveFormsModule,
    RouterModule.forChild([{
      path: '',
      component: AdminLayoutComponent,
      children: [{path:'reports/courtesies',component:CourtesiesComponent},{path:'reports/products',component:ProductsReportComponent},{path:'reports/sales-summary',component:SalesSummaryComponent},{path:'reports/tax-associations',component:TaxAssociationsComponent},{path:'reports/orders',component:OrdersReportComponent},{path:'reports',pathMatch:'full',redirectTo:'reports/payment-transactions'},{path:'reports/payment-transactions',component:PaymentTransactionsComponent},{path:'',component:DashboardComponent},{path:'external-sales',component:ExternalSalesComponent},
        { path: 'settings', component: SettingsComponent },
        { path: 'shifts', component: ShiftsComponent },
        { path: 'cash', children: [
          { path: '', pathMatch: 'full', redirectTo: 'registers' },
          { path: 'registers', component: CashRegistersComponent },
          { path: 'movements', component: CashMovementsComponent },
        ] },
        { path: 'customers', component: CustomersComponent },
        { path: 'promotions', component: PromotionsComponent },
        { path: 'employees', component: EmployeesComponent },
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
