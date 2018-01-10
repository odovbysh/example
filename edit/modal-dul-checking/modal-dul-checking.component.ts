import { OnInit, HostListener } from '@angular/core';
import { Localization, TranslationService, LocaleService } from 'angular-l10n';
import { Component } from '@angular/core';
import { Modal } from '../../shared/services/modal-service/modal.module.service';

@Component({
  selector: 'my-modal-dul-checking',
  templateUrl: 'modal-dul-checking.component.html',
  styleUrls: ['../../shared/services/modal-service/modal.component.scss', 'modal-dul-checking.component.scss']
})
@Modal()
export class DulCheckingModalComponent extends Localization implements OnInit {

  private cancel: Function;
  public isHideAddInfo: boolean = true;

  private ok: Function;
  private destroy: Function;
  private closeModal: Function;

  @HostListener('document:keydown', ['$event'])
  onKeydownComponent(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.keyCode === 27) {
      this.onCancel && this.onCancel(event);
    }
  }

  constructor(public locale: LocaleService, public translation: TranslationService) {
    super(locale, translation);
  }

  onCancel(event: Event): void {
    event = event || window.event;
    event!.preventDefault();

    this.cancel();
    this.closeModal();
    this.destroy();
  }

  onOk(event: Event): void {
    event = event || window.event;
    event!.preventDefault();

    this.ok();
    this.closeModal();
    this.destroy();
  }

  ngOnInit() {
  }
}
