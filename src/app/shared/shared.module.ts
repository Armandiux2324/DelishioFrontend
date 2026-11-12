import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SessionHeaderComponent } from './session-header/session-header.component';

@NgModule({
  declarations: [SessionHeaderComponent],
  imports: [CommonModule],
  exports: [SessionHeaderComponent],
})
export class SharedModule {}
