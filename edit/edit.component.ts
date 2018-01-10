import { Component, OnDestroy, ElementRef, ChangeDetectorRef } from '@angular/core';
import {Localization, TranslationService, LocaleService} from 'angular-l10n';
import {ApiService} from '../shared';
import {
  UserInfo, DocInfo, DocElement, DocInfoClass, DocElementClass, UserInfoClass,
  CitizenshipReferenceElement, UserConfirmAddressInfo
} from '../shared/interfaces/interfaces.all';
import { FormGroup, Validators, FormControl, FormBuilder, AbstractControl } from '@angular/forms';
import {UserService} from '../shared';
import {Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {ModalService} from '../shared/services/modal-service/modal.module.service';
import {ConfigService} from '../shared/services/config.service';
import {CustomLocaleService} from '../shared/services/custom.locale.service';
import {IMyOptions} from 'mydatepicker';
import {ReqsfullService} from '../shared/services/reqsfull.service';
import { DadataService } from '../shared/services/dadata.service';

import { DulCheckingModalComponentNgFactory } from '../../../compiled/src/app/edit/modal-dul-checking/modal-dul-checking.component.ngfactory';
import { SameSnilsModalComponentNgFactory } from '../../../compiled/src/app/edit/modal-same-snils/modal-same-snils.component.ngfactory';
import { DatePickerService } from '../shared/services/date.service';

@Component({
  selector: 'my-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})

export class EditComponent extends Localization implements OnDestroy {

  public complexForm: FormGroup;
  public selectedFocusInputElement: string = '';

  public subscription: Subscription;
  public identityDocument: string = 'RF_PASSPORT'; // TODO : change with config : this.cfg.config.type.document.rf_pass;
  public identityDocumentOriginal: string;
  public noPatronymic: boolean;
  public passportSerNum: string;
  public passportIntSerNum: string = '';

  public userData: UserInfo = new UserInfoClass;
  public userDataOriginal: UserInfo = new UserInfoClass;
  public userDocsOriginal: DocInfo = new DocInfoClass;
  public userPassportRF: DocElement = new DocElementClass;
  public userFIDDocument: DocElement = new DocElementClass;
  public userPassportForeign: DocElement = new DocElementClass;

  public citizenshipArr: CitizenshipReferenceElement[] = [];
  public noSnils: boolean;
  public isExistSnils: boolean;
  public status: number;
  public isRFSelectStart: boolean;
  public isRedirectedFrom: boolean = false;
  public isInitUserData: boolean = false;
  public isSubmitted: boolean = false;
  public isSameTrustedSnils: boolean = false;
  public isCheckOnlyFIO: boolean = false;

  private fieldsObj: any = {
    'RUS': [
      'passportSerNum',
      'issuedBy',
      'issueDate',
      'issueId'
    ],
    'FGN': [
      'surnameInt',
      'nameInt',
      'passportSerNumInt',
      'issuedByInt',
      'issueDateInt',
      'issuedUntilInt'
    ],
    'FID_DOC': [
      'seriesFIDDoc',
      'numberFIDDoc',
      'issueDateFIDDoc'
    ]
  };
  // Список проверки только ФИ или ФИО
  private checkFIOList: any = [
    'lastName',
    'firstName',
    'middleName'
  ];
  // Список полей для проверк на непустоту обязательных полей для ДУЛ
  private dulArray: any[] = [
    'lastName',
    'firstName',
    'middleName',
    'birthDate'
  ];
  // Список полей типа datePicker
  private dpIdList: any[] = [
    'birthDate',
    'issueDateInt',
    'issuedUntilInt',
    'issueDate',
    'issueDateFIDDoc'
  ];

  public chkCfmCode: boolean = false;
  public isContainsUpCfmCodeOrAddress: boolean = false;

  private cldSubscrib: Subscription;
  public customLocale: string;
  public customPlaceholder: string;
  public dpOptionsFromInt: IMyOptions = {};
  public dpOptionsToInt: IMyOptions = {};
  public dpOptionsFID: IMyOptions = {};
  public dpOptionsRF: IMyOptions = {};
  public dpOptionsBirthDate: IMyOptions = {};

  private baseOptions: IMyOptions = {
    sunHighlight: false,
    dateFormat: 'dd.mm.yyyy',
    firstDayOfWeek: 'mo',
    height: '40px',
    width: '100%',
    selectionTxtFontSize: '16px',
    disableUntil: {year: 1900, month: 12, day: 31},
    disableSince: {year: 0, month: 0, day: 0},
    showSelectorArrow: false,
    componentDisabled: false,
    showClearDateBtn: false
  };

  public submitted;

  constructor(public locale: LocaleService,
              public translation: TranslationService,
              private api: ApiService,
              public cfg: ConfigService,
              private userInfo: UserService,
              public rqsf: ReqsfullService,
              public dadata: DadataService,
              private fb: FormBuilder,
              private router: Router,
              private el: ElementRef,
              public dp: DatePickerService,
              private cd: ChangeDetectorRef,
              private cldService: CustomLocaleService,
              private modalService: ModalService,
              private cdr: ChangeDetectorRef) {
    super(locale, translation);

    this.isRedirectedFrom = router.parseUrl(router.url).queryParams['req'] !== undefined;

    this.citizenshipArr = this.api.getCitizenshipArr();

    if (this.api.isEmpty(this.rqsf.getReqsfull())) {
      this.rqsf.update();
    }

    this.complexForm = fb.group({
      'lastName': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.maxLength(60),
          Validators.pattern(this.cfg.validRegExp.lastName)
        ])),
      'firstName': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.maxLength(60),
          Validators.pattern(this.cfg.validRegExp.firstName)
        ])),
      'middleName': new FormControl({
          value: '',
          disabled: !this.userDataOriginal.birthDate ? false : !this.noPatronymic
        },
        Validators.compose([
          Validators.required,
          Validators.maxLength(60),
          Validators.pattern(this.cfg.validRegExp.middleName)
        ])),
      'noPatronymic': new FormControl({value: false, disabled: false}, Validators.nullValidator),
      'gender': new FormControl({value: null, disabled: false}, Validators.required),
      'birthDate': new FormControl({value: {formatted: ''}, disabled: false},
        Validators.compose([
          Validators.required
        ])),
      'birthPlace': new FormControl({value: null, disabled: false},
        Validators.compose([Validators.required, Validators.maxLength(255)])),
      'citizenship': new FormControl({value: null, disabled: false}, Validators.required),
      'identityDocument': new FormControl({value: null, disabled: true}, Validators.nullValidator),

      'seriesFIDDoc': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.pattern(this.cfg.validRegExp.cyrIntName)
        ])),
      'numberFIDDoc': new FormControl({value: null, disabled: false}, Validators.compose([
        Validators.required,
        Validators.pattern(this.cfg.validRegExp.cyrIntName)
      ])),
      'issueDateFIDDoc': new FormControl({value: {formatted: ''}, disabled: false},
        Validators.compose([
          Validators.required
        ])),

      'surnameInt': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.pattern(this.cfg.validRegExp.intNatName) // intNatName cyrillicName
        ])),
      'nameInt': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.pattern(this.cfg.validRegExp.intNatName) // intNatName cyrillicName
        ])),
      'passportSerNumInt': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.pattern('((\\d{9})|(' + this.cfg.mask.foreignPassportIdentity.join('').replace(/\//g, '') + '))')
        ])),
      'issuedByInt': new FormControl({value: null, disabled: false},Validators.compose([ Validators.required,
        Validators.pattern(this.cfg.validRegExp.issuedByInt) ])),
      'issueDateInt': new FormControl({value: {formatted: ''}, disabled: false},
        Validators.compose([
          Validators.required
        ])),
      'issuedUntilInt': new FormControl({value: {formatted: ''}, disabled: false},
        Validators.compose([
          Validators.required
        ])),

      'passportSerNum': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.pattern('((\\d{10})|(' + this.cfg.mask.passportRF.join('').replace(/\//g, '') + '))')])),
      'issuedBy': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.maxLength(233),
          Validators.pattern(this.cfg.validRegExp.issuedBy) ])),
      'issueDate': new FormControl({value: {formatted: ''}, disabled: false},
        Validators.compose([
          Validators.required
        ])),
      'issueId': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.pattern('((\\d{6})|(' + this.cfg.mask.passportRFCode.join('').replace(/\//g, '') + '))')])),

      'snils': new FormControl({value: null, disabled: false},
        Validators.compose([
          Validators.required,
          Validators.pattern(this.cfg.mask.snils.join('').replace(/\//g, ''))])),
      'noSnils': new FormControl({value: false, disabled: false}, Validators.nullValidator)
    });
  }

  ngAfterViewInit() {
    this.cldSubscrib = this.cldService.calendarSets$
      .subscribe(() => {
        this.changeCldLocale();
      });

    this.changeCldLocale();

    this.dpOptionsFromInt = {...this.baseOptions};
    this.dp.setDpOpts(this.dpOptionsFromInt, 'issueDate', 'none');

    this.dpOptionsToInt = {...this.baseOptions};
    this.dp.setDpOpts(this.dpOptionsToInt, 'expiryDate');

    this.dpOptionsFID = {...this.baseOptions};
    this.dp.setDpOpts(this.dpOptionsFID, 'issueDate', 'none');

    this.dpOptionsRF = {...this.baseOptions};
    this.dp.setDpOpts(this.dpOptionsRF, 'issueDate', 'none');

    this.dpOptionsBirthDate = {...this.baseOptions};
    this.dp.setDpOpts(this.dpOptionsBirthDate, 'birthDate');

    this.getCommonInformation();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.subscription && this.subscription.unsubscribe();
    this.cldSubscrib && this.cldSubscrib.unsubscribe();

    if (!this.isSubmitted) {
      this.userData.lastName = this.userDataOriginal.lastName;
      this.userData.firstName = this.userDataOriginal.firstName;
      this.userData.middleName = this.userDataOriginal.middleName;
      this.userData.gender = this.userDataOriginal.gender;
      this.userData.birthDate = this.userDataOriginal.birthDate;
      this.userData.birthPlace = this.userDataOriginal.birthPlace;
      this.userData.citizenship = this.userDataOriginal.citizenship;
      this.userData.snils = this.userDataOriginal.snils;
    }
  }

  setSeletectedElement(elemName: string) {
    this.selectedFocusInputElement = elemName;
  }

  changeCldLocale(): void {
    this.customLocale = this.cldService.getCalendarLocale().locale;
    this.customPlaceholder = this.translation.translate('PLACEHOLDER');
  }

  checkCfmCode(isStandby?: boolean): void {
    if (!isStandby) {
      this.complexForm[this.chkCfmCode ? 'enable' : 'disable']();
    }

    this.complexForm[this.chkCfmCode ? 'enable' : 'disable']({
      onlySelf: true,
      emitEvent: false
    });

    // Дизеблим дату рождения принудительно
    let copyOptions = {...this.dpOptionsBirthDate};
    copyOptions.componentDisabled = !this.chkCfmCode;
    this.dpOptionsBirthDate = copyOptions;

    // Дизеблим дату выдач паспорта
    let copyOptionsRF = {...this.dpOptionsRF};
    copyOptionsRF.componentDisabled = !this.chkCfmCode;
    this.dpOptionsRF = copyOptionsRF;

    let copyOptionsFID = {...this.dpOptionsFID};
    copyOptionsFID.componentDisabled = !this.chkCfmCode;
    this.dpOptionsFID = copyOptionsFID;

    let copyOptionsFromInt = {...this.dpOptionsFromInt};
    copyOptionsFromInt.componentDisabled = !this.chkCfmCode;
    this.dpOptionsFromInt = copyOptionsFromInt;

    let copyOptionsToInt = {...this.dpOptionsToInt};
    copyOptionsToInt.componentDisabled = !this.chkCfmCode;
    this.dpOptionsToInt = copyOptionsToInt;

    this.complexForm.markAsUntouched({ onlySelf: true });

    if (this.complexForm.get('noPatronymic').value) {
      this.complexForm.get('middleName').disable();
    };

    this.onIDChange(this.identityDocument);
  }

  checkFormControllerInput(formCtrlName: string, ckeckerName: string): void {
    if (!this.isInitUserData) {
      return;
    }

    this.userData[formCtrlName] = '';
    this.complexForm.get(formCtrlName)[this[ckeckerName] ? 'disable' : 'enable']();
  }

  checkCitizenship(): void {
    if (!this.isInitUserData) {
      return;
    }

    if (this.userData.citizenship === '') {
      if (!this.isContainsUpCfmCodeOrAddress) {
        this.complexForm.get('snils').enable();
        this.complexForm.get('identityDocument').enable();
      }
      this.complexForm.get('identityDocument').setValue('RF_PASSPORT');
      this.rewriteValidatorAndEnable('RUS');

    } else if (this.userData.citizenship === this.cfg.config.citizenship.default) {

      if (!this.userData.trusted && !this.isContainsUpCfmCodeOrAddress) {
        this.complexForm.get('snils').enable();
      }
      let rfDocType = (this.userDocsOriginal && this.userDocsOriginal.elements && this.userDocsOriginal.elements.find(item => {
        return item.id === this.userData.rIdDoc;
      }) || {type: ''}).type;

      let pso = this.rqsf.getReqsfull().psoStu || {};
      if (!this.api.isEmpty(pso.idDocVrfStatus) && !this.api.isEmpty(pso.idDocVrfStatus.verifyingValue)) {
        rfDocType = pso.idDocVrfStatus.verifyingValue ? pso.idDocVrfStatus.verifyingValue.docType : '';
      }

      if (rfDocType === this.cfg.config.type.document.foreign_pass) {
        if (this.chkCfmCode || !this.isContainsUpCfmCodeOrAddress) {
          this.complexForm.get('identityDocument').enable();
        }
        this.complexForm.get('identityDocument').setValue('FOREIGN_PASSPORT');
        this.rewriteValidatorAndEnable('FGN');
        if (!this.api.isEmpty(pso.idDocVrfStatus.verifyingValue)) {
          this.passportIntSerNum = pso.idDocVrfStatus.verifyingValue.series + pso.idDocVrfStatus.verifyingValue.number;
        }

      } else {
        if (this.chkCfmCode || !this.isContainsUpCfmCodeOrAddress) {
          this.complexForm.get('identityDocument').enable();
        }
        this.complexForm.get('identityDocument').setValue('RF_PASSPORT');
        this.rewriteValidatorAndEnable('RUS');
      }

    } else {
      this.complexForm.get('identityDocument').disable();
      this.complexForm.get('identityDocument').setValue('FID_DOC');
      this.rewriteValidatorAndEnable('FID_DOC');
    }

    setTimeout(() => { this.checkIssueRangeOnBirthDate(); }, 100);
  }

  onIDChange(idDoc?): void {
    if (!this.isInitUserData) {
      return;
    }
    this.identityDocument = idDoc || this.el.nativeElement.querySelector('#selectIDdoc').value;

    if (this.userData.citizenship === this.cfg.config.citizenship.default) {
      if (this.identityDocument === 'RF_PASSPORT') {
        this.rewriteValidatorAndEnable('RUS');
      } else {
        this.rewriteValidatorAndEnable('FGN');

        let frgn_pass_Doc: DocElement = this.userDocsOriginal && this.userDocsOriginal.elements &&
          this.userDocsOriginal.elements.find(item => {
            return item.type === this.cfg.config.type.document.foreign_pass;
          }) || new DocElementClass;
        this.passportIntSerNum = (frgn_pass_Doc.series || '') + (frgn_pass_Doc.number || '');
      }
    } else {
      this.complexForm.get('identityDocument').disable();
      this.rewriteValidatorAndEnable('FID_DOC');
    }

    setTimeout(() => { this.checkIssueRangeOnBirthDate(); }, 100);
  }

  rewriteValidatorAndEnable(type: string): void {

    for (let i in this.fieldsObj) {
      if (this.fieldsObj.hasOwnProperty(i)) {

        if (i === type) {
          this.fieldsObj[type].forEach(item => {
            if (this.chkCfmCode || !this.isContainsUpCfmCodeOrAddress) {
              this.complexForm.get('' + item).enable();
            }
          });
        } else {
          this.fieldsObj[i].forEach(item => {
            this.complexForm.get('' + item).disable();
          });
        }

      }
    }
  }

  getCommonInformation(): void {
    if (this.userInfo.isNotEmptyUser()) {
      this.userData = this.userInfo.getUser();
      this.isInitUserData = true;
      this.getUserInfo(this.userData);
    } else {
      this.subscription = this.userInfo.user$
        .subscribe(user => this.getUserInfo(user));
    }
  }

  checkConfirmCodeOrAddress(): void {
    this.isContainsUpCfmCodeOrAddress = !this.isContainsUpCfmCodeOrAddress
      ? this.userDataOriginal.containsUpCfmCode
      : this.isContainsUpCfmCodeOrAddress;

    if (!this.isContainsUpCfmCodeOrAddress) {

      this.dadata.updateUsrCfmAddr({
        callback: (data: UserConfirmAddressInfo) => {
          this.isContainsUpCfmCodeOrAddress = !this.isContainsUpCfmCodeOrAddress
            ? !!(data && data.address)
            : this.isContainsUpCfmCodeOrAddress;

          if (this.isContainsUpCfmCodeOrAddress) {
            this.checkCfmCode(true);
          } else {
            this.chkCfmCode = true;
          }
        }
      });
    } else {
      this.checkCfmCode(true);
    }
  }

  getUserInfo(user): void {
    this.userInfo.checkUrlOnAnchor();

    if (!user || !user.lastName) {
      return;
    }
    this.isInitUserData = true;

    this.userDataOriginal = user;
    this.userData = {...this.userDataOriginal};
    this.userData.citizenship = this.userData.citizenship || this.cfg.config.citizenship.default;

    if (this.userData.trusted) {
      this.complexForm.get('snils').disable();
      this.chkCfmCode = true;
    }

    if (this.userData.birthDate) {
      this.complexForm.get('middleName')[this.userData.middleName ? 'enable' : 'disable']();
      this.complexForm.get('noPatronymic').setValue(!this.userData.middleName, {
        onlySelf: true,
        emitEvent: false,
        emitModelToViewChange: true,
        emitViewToModelChange: false
      });
    }


    this.userDocsOriginal = this.userData.documents;

    this.userPassportRF = {...this.getDocByType(this.cfg.config.type.document.rf_pass)};
    this.userPassportRF.type = this.cfg.config.type.document.rf_pass;
    this.userFIDDocument = {...this.getDocByType(this.cfg.config.type.document.fid_doc)};
    this.userFIDDocument.type = this.cfg.config.type.document.fid_doc;
    this.userPassportForeign = {...this.getDocByType(this.cfg.config.type.document.foreign_pass)};
    this.userPassportForeign.type = this.cfg.config.type.document.foreign_pass;

    this.passportSerNum = (this.userPassportRF) ? ('' + this.userPassportRF.series + this.userPassportRF.number) : '';
    this.isExistSnils = !!this.api.env.fidDocValByFms;

    if (this.userData.rIdDoc) {
      let confirmedDoc: DocElement = this.userDocsOriginal && this.userDocsOriginal.elements && this.userDocsOriginal.elements.find(item => {
          return item.id === this.userData.rIdDoc;
        }) || new DocElementClass;

      this.isRFSelectStart = this.userData.citizenship === this.cfg.config.citizenship.default &&
        (confirmedDoc || {type: ''}).type === this.cfg.config.type.document.rf_pass;

      if (this.userData.citizenship === this.cfg.config.citizenship.default) {
        if (this.isRFSelectStart) {
          this.identityDocument = 'RF_PASSPORT';
          this.rewriteValidatorAndEnable('RUS');
        } else {

          this.passportIntSerNum = confirmedDoc.series + confirmedDoc.number;
          this.identityDocument = 'FOREIGN_PASSPORT';
          this.rewriteValidatorAndEnable('FGN');
        }
      } else {
        this.identityDocument = 'FID_DOC';
        this.complexForm.get('identityDocument').disable();
        this.rewriteValidatorAndEnable('FID_DOC');
      }
    } else {
      this.identityDocument = 'RF_PASSPORT';
      this.rewriteValidatorAndEnable('RUS');
    }
    this.identityDocumentOriginal = this.identityDocument;

    this.onIDChange(this.identityDocument);
    this.status = user.level;

    if (!this.userData.trusted) {
      this.checkConfirmCodeOrAddress();
    }

    let pso = this.rqsf.getReqsfull().psoStu || {};
    this.userData.snils = (!this.api.isEmpty(pso.snilsVrfStatus) ? pso.snilsVrfStatus.verifyingValue : '') || this.userData.snils;
    this.userData.birthPlace = (!this.api.isEmpty(pso.birthplaceVrfStatus) ? pso.birthplaceVrfStatus.verifyingValue : '') || this.userData.birthPlace;
    this.userData.gender = (!this.api.isEmpty(pso.genderVrfStatus) ? pso.genderVrfStatus.verifyingValue : '') || this.userData.gender;

    this.userData.middleName = pso.middleNameVrfStatus && pso.middleNameVrfStatus.verifyingValue
      ? pso.middleNameVrfStatus.verifyingValue
      : this.userData.middleName || '';
    this.userData.lastName = pso.lastNameVrfStatus && pso.lastNameVrfStatus.verifyingValue
      ? pso.lastNameVrfStatus.verifyingValue
      : this.userData.lastName || '';
    this.userData.firstName = pso.firstNameVrfStatus && pso.firstNameVrfStatus.verifyingValue
      ? pso.firstNameVrfStatus.verifyingValue
      : this.userData.firstName || '';

    this.userData.birthDate = (pso.birthdayVrfStatus && pso.birthdayVrfStatus.verifyingValue ? this.api.toDate(pso.birthdayVrfStatus.verifyingValue) : '') || this.userData.birthDate;
    this.userData.citizenship = (!this.api.isEmpty(pso.citizenshipVrfStatus) ? pso.citizenshipVrfStatus.verifyingValue : '') || this.userData.citizenship;

    if (!this.api.isEmpty(pso.idDocVrfStatus) && !this.api.isEmpty(pso.idDocVrfStatus.verifyingValue)) {
      let doc = pso.idDocVrfStatus.verifyingValue;

      switch (doc && doc.docType) {
        case this.cfg.config.type.document.rf_pass:
          // this.complexForm.get('identityDocument').setValue('RF_PASSPORT');
          this.identityDocument = 'RF_PASSPORT';
          // this.isRFSelectStart = true;
          // this.onIDChange('RF_PASSPORT');
          this.passportSerNum = doc.series + doc.number;
          this.userPassportRF.issuedBy = doc.issuedBy;
          this.userPassportRF.issueId = doc.issuerId;
          this.userPassportRF.issueDate = doc.issueDate;
          break;
        case this.cfg.config.type.document.foreign_pass:
          // this.complexForm.get('identityDocument').setValue('FOREIGN_PASSPORT');
          this.identityDocument = 'FOREIGN_PASSPORT';
          // this.onIDChange('FOREIGN_PASSPORT');
          this.userPassportForeign.issueDate = doc.issueDate;
          this.userPassportForeign.expiryDate = doc.expiryDate;
          this.userPassportForeign.issuedBy = doc.issuedBy;
          this.userPassportForeign.firstName = doc.latinFirstName;
          this.userPassportForeign.lastName = doc.latinLastName;
          this.passportIntSerNum = doc.series + doc.number;
          break;
        case this.cfg.config.type.document.fid_doc:
          // this.complexForm.get('identityDocument').setValue('FID_DOC');
          this.identityDocument = 'FID_DOC';
          // this.onIDChange('FID_DOC');
          this.userFIDDocument.series = doc.series;
          this.userFIDDocument.number = doc.number;
          this.userFIDDocument.issueDate = doc.issueDate;
          break;
      }
    }
  }

  getDocByType(type: string): DocElement {
    return (this.userDocsOriginal && this.userDocsOriginal.elements && this.userDocsOriginal.elements.length > 0)
      ? this.userDocsOriginal.elements.find(item => {
        return item.type === type;
      }) || new DocElementClass
      : new DocElementClass;
  }

  fillPassportSerNum(): void {
    let serNum = this.passportSerNum ? this.passportSerNum.replace(/\s/g, '') : '';

    if (serNum && serNum.length > 0) {
      this.userPassportRF.series = serNum.slice(0, 4);
      this.userPassportRF.number = serNum.slice(4);
    }
  }

  fillIntPassportSerNum(): void {
    let serNum = this.passportIntSerNum.replace(/\s/g, '');

    if (serNum && serNum.length > 0) {
      this.userPassportForeign.series = serNum.slice(0, 2);
      this.userPassportForeign.number = serNum.slice(2);
    }
  }

  checkOnValidate(): boolean {
    let ctrls: any = this.complexForm.controls;
    let firstInvalidFieldId = null;


    // Проверка заполненности всех полей кроме ФИ или ФИО
    if (this.userData.level === 1) {

      // 1. Проверяем все контролы формы, смотрим только на видимые
      // 2. Допускаем, что все поля изначально пустые или незаполненные(+datePicker) : this.isCheckOnlyFIO = true
      this.isCheckOnlyFIO = true;
      for (let i in ctrls) {

        // 1. Проверка заполненности только ФИ или ФИО , остальные поля д.б. активными и пустыми
        // 2. Если какое-то поле пустое: this.isCheckOnlyFIO = false , дальше не проверяем и остальные пропускаем
        // 3. nonCheckList - поля , не требующие проверки : чекеры или всегда заполненные поля
        let nonCheckList = [
          'noPatronymic',
          'citizenship',
          'identityDocument',
          'noSnils'
        ];
        if (this.isCheckOnlyFIO &&
          (i && !new RegExp(`^(${nonCheckList.join('|')})$`, 'gi').test(i) && ctrls[i].enabled)) {

          // Проходим те поля , что не ФИО и проверяем что бы они были пустыми.
          // В случае , если какие-то поле непустое выставляем this.isCheckOnlyFIO = false
          // и игнорируем проверку остальных полей
          if (!this.checkFIOList.some(item => item === i)) {
            this.isCheckOnlyFIO = !!~this.dpIdList.indexOf(i) ? ctrls[i].value.formatted === '' : !ctrls[i].value;
          }
        }
      }
    }

    // Проверяем все контролы формы, смотрим только на видимые
    for (let i in ctrls) {
      // Если компонент видимый, то помечаем его как dirty и touched
      if (ctrls[i].enabled && (this.isCheckOnlyFIO ? this.checkFIOList.some(item => item === i) : true)) {
        ctrls[i].markAsDirty(true);
        ctrls[i].markAsTouched(true);

        // Для календарей придется проверять value.formatted
        if (!!~this.dpIdList.indexOf(i) && ctrls[i].value.formatted === '') {
          firstInvalidFieldId = firstInvalidFieldId || i;
        }
        if (ctrls[i].invalid) {
          firstInvalidFieldId = firstInvalidFieldId || i;
        }
      }
    }

    firstInvalidFieldId && this.userInfo.goToAnchor(firstInvalidFieldId, true);

    // Так как кнопка теперь никогда не дизейблится, то в случае невалидности формы - ничего не делаем
    return !!firstInvalidFieldId;
  }

  onSubmit(): void {
    let activeIssueDate = this.getActiveIssueDate();
    if (this.ckeckOnClearable(activeIssueDate.ctrl.value, activeIssueDate.ctrlName, this.complexForm.controls['birthDate'], true)) { return; }
    if (this.checkOnValidate()) { return; }

    let userDataForPost: UserInfo = {...this.userData};
    let documentObj: DocElement = new DocElementClass;

    if (this.userData.citizenship === this.cfg.config.citizenship.default) {
      if (this.complexForm.controls['identityDocument'].value === 'RF_PASSPORT') {
        // RF_PASSPORT
        documentObj = new DocElementClass(this.userPassportRF);
      } else {
        // FRGN_PASS
        documentObj = new DocElementClass(this.userPassportForeign);

        // Костыли, потому что должны быть разные поля для ведомства
        documentObj.latinFirstName = this.userPassportForeign.firstName;
        documentObj.latinLastName = this.userPassportForeign.lastName;
        delete documentObj.firstName;
        delete documentObj.lastName;
      }
    } else {
      // FID_DOC
      documentObj = new DocElementClass(this.userFIDDocument);
    }

    userDataForPost = {
      lastName: userDataForPost.lastName,
      firstName: userDataForPost.firstName,
      middleName: userDataForPost.middleName,
      gender: userDataForPost.gender,
      birthDate: this.complexForm.controls['birthDate'].value.formatted,
      birthPlace: userDataForPost.birthPlace,
      citizenship: userDataForPost.citizenship,
      snils: userDataForPost.snils
    };
    documentObj.issueId ? documentObj.issueId = documentObj.issueId.replace(/\s|-/g, '') : '';
    userDataForPost.documents = {
      elements: [documentObj]
    };

    for (let prop in this.userData) {
      // Чистим всех пустые поля
      if (this.userData[prop] === '') {
        delete userDataForPost[prop];
      }
      // Удаляем все атрибуты , если заполняем только ФИ или ФИО
      if (this.isCheckOnlyFIO && !this.checkFIOList.some(item => item === prop)) {
        delete userDataForPost[prop];
      }
    }

    // 1. Используем '/up' :
    // 1.1 для упрощенной (исключение когда только ФИ или ФИО)
    // 1.2 стандартной
    // 2. Без '/up' :
    // 2.1 для подтвержденной
    // 2.2 для упрощенца ИГ без СНИЛС и fidDocValByFms = true
    // 2.3 для упрощенца, когда только ФИ или ФИО
    this.api.postRequest(
      this.status && this.status > 2 || this.complexForm.controls['noSnils'].value || this.isCheckOnlyFIO
        ? ''
        : 'up',
      userDataForPost,
      (data) => {
        this.isSubmitted = true;

        this.rqsf.isFreezeUpdateProcess = false;
        this.rqsf.getReqsfull().reqs = [];
        this.userDataOriginal.change = true;

        if (this.isCheckOnlyFIO) {
          this.userInfo.update(
            () => {},
            () => {
              this.router.navigate(['/profile/user/personal']);
            });
        } else {
          this.userInfo.setUser(this.userDataOriginal);
          this.router.navigate(['/profile/user/personal']);
        }
        // Обнуляем после запуска АПИ (если ошибка АПИ - продолжаем работу с формой)
        this.isCheckOnlyFIO = false;
      },
      (err) => {
        this.api.popupError(
          err.code,
          err.status,
          {value: this.complexForm.get('snils').value},
          () => {
            this.focusOnSnils();
          }
        );
        // Обнуляем после запуска АПИ (если ошибка АПИ - продолжаем работу с формой)
        this.isCheckOnlyFIO = false;
      });
  }

  onChangeSnils(): void {
    this.isSameTrustedSnils = false;
  }

  checkSnils(): void {
    if (this.userDataOriginal.snils !== this.complexForm.get('snils').value) {
      this.api.getEsiaRsRequest(
        'srch/snils/state?snils=' + this.complexForm.get('snils').value.trim().replace(' ', '+'),
        data => {
          if (data && /0|1|2|3/.test('' + data.code)) {
            switch ('' + data.code) {
              case '0':
              case '1':
                this.wrapperCheckDULFields();
                break;
              case '2':
                this.popupSameSnils();
                break;
              case '3':
                this.isSameTrustedSnils = true;
                break;
              default:
            }
          } else {

          }
        });
    } else {
      this.wrapperCheckDULFields();
    }
  }

  wrapperCheckDULFields(): void {
    this.isPristineDULFields() ? this.onSubmit() : this.popupCkeckDulFields();
  }

  onCancel(event: Event): void {
    event = event || window.event;
    event!.preventDefault();

    this.router.navigate(['/profile/user/personal']);
  }

  popupSameSnils(isExistTrustUser?: boolean): void {
    this.modalService.popupInject(SameSnilsModalComponentNgFactory, {
      snils: this.userData.snils,
      isExistTrustUser: isExistTrustUser
      , ok: () => {
        this.wrapperCheckDULFields();
      }
      , cancel: () => {
        this.focusOnSnils();
      }
    });
  }

  popupCkeckDulFields(): void {
    this.modalService.popupInject(DulCheckingModalComponentNgFactory, {
      ok: () => {
        this.onSubmit();
      }
      , cancel: () => {
        this.focusOnSnils();
      }
    });
  }

  focusOnSnils(): void {
    this.el.nativeElement.querySelector('[name="snils"]').focus();
  }


  isPristineDULFields(): boolean {

    let isSameDulFields: boolean =
      this.dulArray.every(item => {
        if (!/Date|Until/.test(item)) {
          return this.complexForm.get('' + item).value === this.userData[item];
        } else {
          return this.complexForm.get('' + item).value.formatted === this.userData[item];
        }
      });

    let isSameIdDocFields = false;
    if (this.userData.citizenship === this.userDataOriginal.citizenship &&
      this.identityDocument === this.identityDocumentOriginal) {

      if (this.userData.citizenship === this.cfg.config.citizenship.default) {
        if (this.identityDocument === 'RF_PASSPORT') {
          isSameIdDocFields = this.fieldsObj['RUS'].every(
            item => {
              if (!/Date|Until/.test(item)) {
                return this.complexForm.get('' + item).value === this.userPassportRF[item];
              } else {
                return this.complexForm.get('' + item).value.formatted === this.userPassportRF[item];
              }
            }
          );
        } else {
          isSameIdDocFields = this.fieldsObj['FGN'].every(
            item => {
              if (!/Date|Until/.test(item)) {
                return this.complexForm.get('' + item).value === this.userPassportForeign[item];
              } else {
                return this.complexForm.get('' + item).value.formatted === this.userPassportForeign[item];
              }
            }
          );
        }
      } else {
        isSameIdDocFields = this.fieldsObj['FID_DOC'].every(
          item => {
            if (!/Date|Until/.test(item)) {
              return this.complexForm.get('' + item).value === this.userFIDDocument[item];
            } else {
              return this.complexForm.get('' + item).value.formatted === this.userFIDDocument[item];
            }
          }
        );
      }
    } else {
    }

    return (this.userDataOriginal.regType === this.cfg.config.regType.by_operator && this.status === 1)
      ? isSameDulFields && isSameIdDocFields
      : true;
  }

  getActiveIssueDate(): {
    ctrl: AbstractControl,
    dpOpt: string,
    ctrlName: string
  } {
    let dateObj = {
      birthDate: {
        ctrl: this.complexForm.controls['birthDate'],
        dpOpt: this.dpOptionsBirthDate,
        ctrlName: 'birthDate'
      },
      issueDateRF_PASSPORT: {
        ctrl: this.complexForm.controls['issueDate'],
        dpOpt: this.dpOptionsRF,
        ctrlName: 'issueDate'
      },
      issueDateFOREIGN_PASSPORT: {
        ctrl: this.complexForm.controls['issueDateInt'],
        dpOpt: this.dpOptionsFromInt,
        ctrlName: 'issueDateInt'
      },
      issueDateFID_DOC: {
        ctrl: this.complexForm.controls['issueDateFIDDoc'],
        dpOpt: this.dpOptionsFID,
        ctrlName: 'issueDateFIDDoc'
      }
    };

    return dateObj['issueDate' + this.identityDocument];
  }

  checkIssueRangeOnBirthDate() {
    let activeIssueDate = this.getActiveIssueDate();
    this.ckeckOnClearable(activeIssueDate.ctrl.value, activeIssueDate.ctrlName, this.complexForm.controls['birthDate'], true);
  }

  ckeckOnClearable(event, eventCtrlName, ctrl, isRevertAct = false): boolean {
    if (event && event.jsdate && ctrl && ctrl.value && ctrl.value.jsdate) {
      if (!isRevertAct) {
        if (event.jsdate > ctrl.value.jsdate) {

          ctrlReset(ctrl);
          ctrlReset(this.complexForm.controls[eventCtrlName]);

          /** Set any error - it doesn't matter */
          this.complexForm.controls[eventCtrlName].setErrors({
            'wrong_range': true
          });

          return true;
        } else {
          ctrl.setErrors(null);
          this.complexForm.controls[eventCtrlName].setErrors(null);
        }
      } else {
        if (event.jsdate < ctrl.value.jsdate) {

          ctrlReset(ctrl);
          ctrlReset(this.complexForm.controls[eventCtrlName]);

          /** Set any error - it doesn't matter */
          this.complexForm.controls[eventCtrlName].setErrors({
            'wrong_range': true
          });

          return true;
        } else {
          ctrl.setErrors(null);
          this.complexForm.controls[eventCtrlName].setErrors(null);
        }
      }
    }

    this.cd.detectChanges();
    return false;

    function ctrlReset(ctrl: AbstractControl) {
      let val = ctrl.value;
      ctrl.setValue('');
      ctrl.setValue(val);
    }
  }

  onDateChanged(event, type, expiry?: string): void {
    if (!event) { return; }

    if (type === 'BIRTH_DATE') {
      this.userData.birthDate = event.formatted;
      this.ckeckOnClearable(event, 'birthDate', this.getActiveIssueDate().ctrl, false);

    } else if (type === 'FID_DOC') {
      this.userFIDDocument.issueDate = event.formatted;
      this.ckeckOnClearable(event, 'issueDateFIDDoc', this.complexForm.controls['birthDate'], true);

    } else if (type === 'FRGN_PASS') {
      if (expiry) {
        this.userPassportForeign.expiryDate = event.formatted;
      } else {
        this.userPassportForeign.issueDate = event.formatted;
        this.ckeckOnClearable(event, 'issueDateInt', this.complexForm.controls['birthDate'], true);
      }
    } else if (type === 'RF_PASSPORT') {
      this.userPassportRF.issueDate = event.formatted;
      this.ckeckOnClearable(event, 'issueDate', this.complexForm.controls['birthDate'], true);
    }
    this.cd.detectChanges();
  }

  checkKey(event: KeyboardEvent) {
    let regex = new RegExp(this.cfg.validRegExp.intNatName, 'i');

    if (!regex.test(event.key)) {
      event!.preventDefault();
      return false;
    }
  }
}
