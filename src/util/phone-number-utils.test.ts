import { PhoneNumberLabel } from '../models';
import { parsePhoneNumber } from './phone-number-utils';

describe('parsePhoneNumber', () => {
  describe('parses phone numbers for the current region to correct e164 number', () => {
    it('for Germany', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
          'de-DE',
        ).e164,
      ).toEqual('+4915799912345');
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '0173 CHOO CHOO' },
          'de-DE',
        ).e164,
      ).toEqual('+4917324662466');
    });
    it('for Belgium', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '0495 46.68.28' },
          'fr-BE',
        ).e164,
      ).toEqual('+32495466828');
    });
    it('for Luxembourg', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '26954490' },
          'fr-LU',
        ).e164,
      ).toEqual('+35226954490');
    });
    it('for Sweden', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '08-663 88 95 ' },
          'se-SE',
        ).e164,
      ).toEqual('+4686638895');
    });
    it('for Poland', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '801 111 111' },
          'pl-PL',
        ).e164,
      ).toEqual('+48801111111');
    });
    it('for Spain', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '913 693 210' },
          'es-ES',
        ).e164,
      ).toEqual('+34913693210');
    });
    it('for USA', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '(212) 366-1182' },
          'en-US',
        ).e164,
      ).toEqual('+12123661182');

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '415 (555) SHOE' },
          'en-US',
        ).e164,
      ).toEqual('+14155557463');

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '415 CHOO CHOO' },
          'en-US',
        ).localized,
      ).toEqual('41524662466');

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '415 CHOO CHOO' },
          'en-US',
        ).e164,
      ).toEqual('415 CHOO CHOO');
    });
  });

  describe('parses phone numbers from a different region to correct e164 number', () => {
    it('for a non-german number in Germany', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '+48 601 777 257' },
          'de-DE',
        ).e164,
      ).toEqual('+48601777257');

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '+442012341234' },
          'de-DE',
        ).localized,
      ).toEqual('+44 20 1234 1234');
    });
    it('for a german number outside of Germany', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '+49 1579 99 12345' },
          'fr-LU',
        ).e164,
      ).toEqual('+4915799912345');
    });
  });

  describe('parses different number formats correctly', () => {
    it('if it is a German mobile number', () => {
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
          {
            label: PhoneNumberLabel.WORK,
            phoneNumber: '+49 (1579) 991/2-3 4 5',
          },
          'de-DE',
        ).e164,
      ).toEqual('+4915799912345');
    });
  });

  describe('deals correctly with invalid locale', () => {
    it('where only language is set', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
          'de',
        ).e164,
      ).toEqual('+4915799912345');
    });

    it('where only region is set and wrongly cased ', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
          'De',
        ).e164,
      ).toEqual('+4915799912345');
    });

    it('where only region is set', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '015799912345' },
          'DE',
        ).e164,
      ).toEqual('+4915799912345');
    });

    it('where it is an empty string', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '801 111 111' },
          '',
        ).e164,
      ).toEqual('801 111 111');
    });
  });

  describe('deals correctly with invalid phone numbers', () => {
    it('returns initial phone number on invalid phone number', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: 'invalid' },
          'de-DE',
        ).e164,
      ).toEqual('invalid');
    });
  });

  describe('deals correctly with special numbers', () => {
    it('formats a direct dial correctly', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '22' },
          'de-DE',
        ).e164,
      ).toEqual('22');
    });

    it('formats a direct dial correctly', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '22' },
          'en-GB',
        ).e164,
      ).toEqual('22');
    });

    it('formats emergency numbers correctly', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '112' },
          'de-DE',
        ).e164,
      ).toEqual('112');

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '110' },
          'de-DE',
        ).localized,
      ).toEqual('110');

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '911' },
          'en-US',
        ).localized,
      ).toEqual('911');
    });
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

  describe('parses phone numbers for the current region correctly to a local number', () => {
    it('if regionCode from Germany', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '+49 203 987 415 02' },
          'de-DE',
        ).localized,
      ).toEqual('0203 98741502');
    });

    it('if region Code from another country than germany', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '+353 86 412 0894' },
          'en-IE',
        ).localized,
      ).toEqual('086 412 0894');
    });

    it('if ignoreRegion flag is set', () => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: '+353 86 412 0894' },
          'de-DE',
          true,
        ).localized,
      ).toEqual('086 412 0894');
    });
  });

  describe('deals correctly with sipgate special numbers', () => {
    const specialNumbers = ['10005', '10000', '10020', '20000'];

    it.each(specialNumbers)('parses %s correctly', (number) => {
      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: number },
          'de-DE',
        ).e164,
      ).toEqual(number);

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: number },
          'de-DE',
        ).localized,
      ).toEqual(number);

      expect(
        parsePhoneNumber(
          { label: PhoneNumberLabel.WORK, phoneNumber: number },
          'en-GB',
        ).e164,
      ).toEqual(number);
    });
  });
  //
  // describe.skip('test like sipgate java', () => {
  //   expect(
  //     parsePhoneNumber(
  //       { label: PhoneNumberLabel.WORK, phoneNumber: '02089939152' },
  //       'de-DE',
  //     ).e164,
  //   ).toEqual('+492089939152');
  //   expect(
  //     parsePhoneNumber(
  //       { label: PhoneNumberLabel.WORK, phoneNumber: '00492089939152' },
  //       'de-DE',
  //     ).e164,
  //   ).toEqual('+492089939152');
  //   expect(
  //     parsePhoneNumber(
  //       { label: PhoneNumberLabel.WORK, phoneNumber: '+492089939152' },
  //       'de-DE',
  //     ).e164,
  //   ).toEqual('+492089939152');
  //   expect(
  //     parsePhoneNumber(
  //       { label: PhoneNumberLabel.WORK, phoneNumber: '492089939152' },
  //       'de-DE',
  //     ).e164,
  //   ).toEqual('+492089939152');
  //   expect(
  //     parsePhoneNumber(
  //       { label: PhoneNumberLabel.WORK, phoneNumber: '04922579' },
  //       'de-DE',
  //     ).e164,
  //   ).toEqual('+494922579');
  //
  //   it('Telefonnummer Borkum von local ohne führende 0', () => {
  //     expect(
  //       parsePhoneNumber(
  //         { phoneNumber: '4922579', label: PhoneNumberLabel.WORK },
  //         'de-DE',
  //       ).e164,
  //     ).toEqual('+494922579');
  //   });
  //
  //   it('Telefonnummer Borkum von e164 dekoriert', () => {
  //     expect(
  //       parsePhoneNumber(
  //         { label: PhoneNumberLabel.WORK, phoneNumber: '00494922579' },
  //         'de-DE',
  //       ).e164,
  //     ).toEqual('+494922579');
  //
  //     expect(
  //       parsePhoneNumber(
  //         {
  //           phoneNumber: '+494922579',
  //           label: PhoneNumberLabel.WORK,
  //         },
  //         'de-DE',
  //       ).e164,
  //     ).toEqual('+494922579');
  //   });
  // });
});
