import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationModule } from 'angular-l10n';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MyDatePickerModule } from 'mydatepicker';
import { TextMaskModule } from 'angular2-text-mask';
import { SharedModule } from '../shared/shared.module';
import { EditRoutingModule } from './edit.routing';

import { EditComponent }   from './edit.component';

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MyDatePickerModule,
    TextMaskModule,
    SharedModule,
    EditRoutingModule,
    TranslationModule
  ],
  exports: [],
  declarations: [
    EditComponent
  ],
  providers: [],
})
export class EditModule { }
