import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  LucideDynamicIcon, provideLucideIcons, LucideBuilding2, LucideLayoutDashboard,
  LucideUtensils, LucidePercent, LucidePackage, LucideChefHat, LucideUsers,
  LucideTag, LucideChartNoAxesCombined, LucideSettings, LucideReceiptText,
  LucideGift, LucideMenu, LucideX, LucideClock3, LucideLoaderCircle,
  LucideCircleAlert, LucideSearch, LucideLogOut, LucideUserRound,
} from '@lucide/angular';
import { FormFeedbackComponent } from './forms/form-feedback.component';
import { AppShellComponent } from './app-shell/app-shell.component';
import { ButtonDirective } from './button/button.directive';
import { DialogComponent } from './dialog/dialog.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { NavigationComponent } from './navigation/navigation.component';
import { PageHeadingComponent } from './page-heading/page-heading.component';
import { PanelComponent } from './panel/panel.component';
import { SessionHeaderComponent } from './session-header/session-header.component';

const components = [
  AppShellComponent, ButtonDirective, DialogComponent, FeedbackComponent,
  NavigationComponent, PageHeadingComponent, PanelComponent, SessionHeaderComponent, FormFeedbackComponent,
];

@NgModule({
  declarations: components,
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  providers: [
    provideLucideIcons(
      LucideBuilding2, LucideLayoutDashboard, LucideUtensils, LucidePercent,
      LucidePackage, LucideChefHat, LucideUsers, LucideTag, LucideChartNoAxesCombined,
      LucideSettings, LucideReceiptText, LucideGift, LucideMenu, LucideX,
      LucideClock3, LucideLoaderCircle, LucideCircleAlert, LucideSearch, LucideLogOut, LucideUserRound,
    ),
  ],
  exports: [...components, LucideDynamicIcon],
})
export class SharedModule {}
