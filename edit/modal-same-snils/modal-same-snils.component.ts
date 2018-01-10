import { OnInit, HostListener } from '@angular/core';
import { Localization, TranslationService, LocaleService } from 'angular-l10n';
import { Component } from '@angular/core';
import { Modal } from '../../shared/services/modal-service/modal.module.service';

@Component({
  selector: 'my-modal-same-snils',
  templateUrl: './modal-same-snils.component.html',
  styleUrls: ['../../shared/services/modal-service/modal.component.scss', './modal-same-snils.component.scss']
})
@Modal()
export class SameSnilsModalComponent extends Localization implements OnInit {

  public snils: string;
  public isExistTrustUser: boolean;
  private cancel: Function;

  private ok: Function;
  private destroy: Function;
  private closeModal: Function;

  @HostListener('document:keydown', ['$event'])
  onKeydownComponent(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.keyCode === 27) {
      this.onCancel(event);
    }
  }

  constructor(public locale: LocaleService,
              public translation: TranslationService) {
    // Do stuff
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
