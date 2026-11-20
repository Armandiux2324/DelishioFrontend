import {Router} from '@angular/router';
import {Component,Input,inject} from '@angular/core';
import {adminReportDefinitions} from './admin-report-definitions';
import {adminReportKinds} from '../../../services/admin-reports.models';
@Component({selector:'app-report-navigation',standalone:false,template:'<details #menu><summary>{{ locale === \'en\' ? \'Reports\' : \'Reportes\' }} · {{ currentTitle() }}</summary><nav [attr.aria-label]="locale === \'en\' ? \'Reports\' : \'Reportes\'">@for (link of links;track link.path) {<a dButton variant="secondary" (click)="menu.open=false" [routerLink]="\'/admin/reports/\' + link.path" routerLinkActive="current" ariaCurrentWhenActive="page">{{ link.title[locale === \'en\' ? 1 : 0] }}</a>}</nav></details>',styles:['details{border:1px solid var(--d-line);border-radius:var(--d-radius-sm);background:var(--d-panel);padding:1rem}summary{cursor:pointer;font-weight:600;line-height:1.6;overflow-wrap:anywhere}summary:focus-visible{outline:2px solid var(--d-brand);outline-offset:3px}nav{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}.current{outline:2px solid var(--d-brand);outline-offset:2px}']})
export class ReportNavigationComponent {
 private readonly router=inject(Router);
 protected currentTitle(){return this.links.find(link=>'/admin/reports/'+link.path===this.router.url.split('?')[0])?.title[this.locale==='en'?1:0]??(this.locale==='en'?'Choose a report':'Selecciona un reporte');}
 @Input() locale:'es'|'en'='es';
 protected readonly links=[{path:'payment-transactions',title:['Transacciones por tipo de pago','Transactions by payment type']},{path:'orders',title:['Reporte de órdenes','Orders report']},{path:'tax-associations',title:['Asociación de impuestos','Tax associations']},{path:'sales-summary',title:['Resumen de ventas','Sales summary']},{path:'products',title:['Reporte de productos','Products report']},{path:'courtesies',title:['Cortesías','Complimentary orders']},...adminReportKinds.map(kind=>({path:kind,title:adminReportDefinitions[kind].title}))];
}
