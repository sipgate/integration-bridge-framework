import { PhoneNumberLabel } from '../models';
import { parsePhoneNumber } from './phone-number-utils';

describe('convertPhoneNumberToE164', () => {
  it('converts local phone numbers', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '0495 46.68.28' },
        'fr-BE',
      ).e164,
    ).toEqual('+32495466828');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '26954490' },
        'fr-LU',
      ).e164,
    ).toEqual('+35226954490');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '08-663 88 95 ' },
        'se-SE',
      ).e164,
    ).toEqual('+4686638895');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '801 111 111' },
        'pl-PL',
      ).e164,
    ).toEqual('+48801111111');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '913 693 210' },
        'es-ES',
      ).e164,
    ).toEqual('+34913693210');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '415 (555) SHOE' },
        'en-US',
      ).e164,
    ).toEqual('+14155557463');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '0173 CHOO CHOO' },
        'de-DE',
      ).e164,
    ).toEqual('+4917324662466');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '415 CHOO CHOO' },
        'en-US',
      ).e164,
    ).toEqual('+141524662466');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '(212) 366-1182' },
        'en-US',
      ).e164,
    ).toEqual('+12123661182');
  });

  it('converts international phone numbers', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '+48 601 777 257' },
        'de-DE',
      ).e164,
    ).toEqual('+48601777257');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '+49 1579 99 12345' },
        'fr-LU',
      ).e164,
    ).toEqual('+4915799912345');
  });

  it('sanitizes phone numbers', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '0157-99912345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: ' 0157-999 12345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: ' 0157-999-12345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '0157/99912345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '01579 (991) 2-3 4 5' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '+49 (1579) 991/2-3 4 5' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
  });

  it('recovers invalid locale', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
        'de',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
        'De',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
        'DE',
      ).e164,
    ).toEqual('+4915799912345');
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
        'de-DE',
      ).e164,
    ).toEqual('+4915799912345');
  });

  it('returns initial phone number on invalid locale', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '801 111 111' },
        '',
      ).e164,
    ).toEqual('801 111 111');
  });

  it('returns initial phone number on invalid phone number', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: 'invalid' },
        'de-DE',
      ).e164,
    ).toEqual('invalid');
  });

  it('formats a phone number from another region', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '+442012341234' },
        'de-DE',
      ).localized,
    ).toEqual('+44 20 1234 1234');
  });
  it('formats a direct dial correctly', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '22' },
        'de-DE',
      ).e164,
    ).toEqual('22');
  });
  it('returns national number for localized if ignoreRegion flag is set', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '+353 86 412 0894' },
        'de-DE',
        true,
      ).localized,
    ).toEqual('086 412 0894');
  });
  it('returns national number for localized if same region', () => {
    expect(
      parsePhoneNumber(
        { label: PhoneNumberLabel.WORK, phoneNumber: '+353 86 412 0894' },
        'en-IE',
      ).localized,
    ).toEqual('086 412 0894');
  });
});
