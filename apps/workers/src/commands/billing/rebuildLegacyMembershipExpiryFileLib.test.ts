import { describe, expect, it } from 'vitest';

import type {
  PaidExpiryQueryRow,
  RebuildLegacyMembershipExpiryFileResult,
} from './rebuildLegacyMembershipExpiryFileLib.js';
import {
  addUtcYears,
  buildPaidExpiryCsv,
  PAID_EXPIRY_SOURCE_SQL,
} from './rebuildLegacyMembershipExpiryFileLib.js';

const NOW = new Date('2026-11-12T05:08:14.500Z');
const CAP = addUtcYears(NOW, 5).toISOString();
const HEADER = 'email,membership_expires_at\n';

function queryRow(
  overrides: Partial<PaidExpiryQueryRow> & Pick<PaidExpiryQueryRow, 'id_text'>
): PaidExpiryQueryRow {
  return {
    email: 'user@example.com',
    membership_expires_at: '2028-01-01T00:00:00Z',
    found: true,
    beyond_five_years: false,
    app_store_window: false,
    ...overrides,
  };
}

function expiryFile(
  csv: string,
  overrides: Partial<RebuildLegacyMembershipExpiryFileResult> = {}
): RebuildLegacyMembershipExpiryFileResult & { csv: string } {
  return {
    rowsWritten: 0,
    capped: 0,
    futureUncapped: 0,
    past: 0,
    noGrant: 0,
    skippedInvalidEmail: 0,
    invalidExpiry: 0,
    missingIds: [],
    ambiguousIds: [],
    invalidEmailIds: [],
    invalidExpiryIds: [],
    futureIds: [],
    pastIds: [],
    cappedIds: [],
    ...overrides,
    csv,
  };
}

describe('addUtcYears', () => {
  it('rolls 29 February forward to 1 March five years later', () => {
    expect(addUtcYears(new Date('2024-02-29T00:00:00.000Z'), 5).toISOString()).toBe(
      '2029-03-01T00:00:00.000Z'
    );
  });
});

describe('PAID_EXPIRY_SOURCE_SQL', () => {
  it('reads membership and the App Store window and does not write', () => {
    expect(PAID_EXPIRY_SOURCE_SQL).toContain('"membershipExpiration"');
    expect(PAID_EXPIRY_SOURCE_SQL).toContain('"appStorePurchase"');
    expect(PAID_EXPIRY_SOURCE_SQL).toContain('"ownerId"');
    expect(PAID_EXPIRY_SOURCE_SQL).toContain('purchase_date_ms');
    expect(PAID_EXPIRY_SOURCE_SQL).toContain('1703635200000');
    expect(PAID_EXPIRY_SOURCE_SQL).toContain('1706745600000');
    expect(PAID_EXPIRY_SOURCE_SQL).toContain("AT TIME ZONE 'UTC'");
    expect(PAID_EXPIRY_SOURCE_SQL.includes('INSERT')).toBe(false);
    expect(PAID_EXPIRY_SOURCE_SQL.includes('UPDATE')).toBe(false);
    expect(PAID_EXPIRY_SOURCE_SQL.includes('DELETE')).toBe(false);
  });
});

describe('buildPaidExpiryCsv', () => {
  it('keeps a year-9000 expiry when there is no App Store window row', () => {
    const stored = '9000-01-01T00:00:00Z';
    expect(
      buildPaidExpiryCsv(
        ['long'],
        [
          queryRow({
            id_text: 'long',
            email: 'long@example.com',
            membership_expires_at: stored,
            beyond_five_years: true,
            app_store_window: false,
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile(`email,membership_expires_at\nlong@example.com,${stored}\n`, {
        rowsWritten: 1,
        futureUncapped: 1,
        futureIds: ['long'],
      })
    );
  });

  it('writes one shared five-year end for every future App Store window row past that end', () => {
    expect(CAP).toBe('2031-11-12T05:08:14.500Z');
    const sameSecond = '2031-11-12T05:08:14Z';
    expect(
      buildPaidExpiryCsv(
        ['z1', 'a1', 'ms'],
        [
          queryRow({
            id_text: 'z1',
            email: 'z@example.com',
            membership_expires_at: '9000-06-01T00:00:00Z',
            beyond_five_years: true,
            app_store_window: true,
          }),
          queryRow({
            id_text: 'a1',
            email: 'a@example.com',
            membership_expires_at: '9000-07-01T00:00:00Z',
            beyond_five_years: true,
            app_store_window: true,
          }),
          queryRow({
            id_text: 'ms',
            email: 'm@example.com',
            membership_expires_at: sameSecond,
            beyond_five_years: true,
            app_store_window: true,
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile(
        [
          'email,membership_expires_at',
          `a@example.com,${CAP}`,
          `m@example.com,${CAP}`,
          `z@example.com,${CAP}`,
          '',
        ].join('\n'),
        {
          rowsWritten: 3,
          capped: 3,
          futureIds: ['z1', 'a1', 'ms'],
          cappedIds: ['z1', 'a1', 'ms'],
        }
      )
    );
  });

  it('keeps a future App Store window expiry that is not beyond five years', () => {
    const edge = '2031-11-12T05:08:14Z';
    const inside = '2027-06-01T00:00:00Z';
    expect(
      buildPaidExpiryCsv(
        ['inside', 'edge'],
        [
          queryRow({
            id_text: 'inside',
            email: 'inside@example.com',
            membership_expires_at: inside,
            beyond_five_years: false,
            app_store_window: true,
          }),
          queryRow({
            id_text: 'edge',
            email: 'edge@example.com',
            membership_expires_at: edge,
            beyond_five_years: false,
            app_store_window: true,
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile(
        [
          'email,membership_expires_at',
          `edge@example.com,${edge}`,
          `inside@example.com,${inside}`,
          '',
        ].join('\n'),
        {
          rowsWritten: 2,
          futureUncapped: 2,
          futureIds: ['inside', 'edge'],
        }
      )
    );
  });

  it('keeps a past expiry when the App Store window flags are set', () => {
    const stored = '2020-01-01T00:00:00Z';
    const sameInstant = '2026-11-12T05:08:14.500Z';
    expect(
      buildPaidExpiryCsv(
        ['past', 'now'],
        [
          queryRow({
            id_text: 'past',
            email: 'past@example.com',
            membership_expires_at: stored,
            beyond_five_years: true,
            app_store_window: true,
          }),
          queryRow({
            id_text: 'now',
            email: 'same@example.com',
            membership_expires_at: sameInstant,
            beyond_five_years: true,
            app_store_window: true,
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile(
        [
          'email,membership_expires_at',
          `past@example.com,${stored}`,
          `same@example.com,${sameInstant}`,
          '',
        ].join('\n'),
        {
          rowsWritten: 2,
          past: 2,
          pastIds: ['past', 'now'],
        }
      )
    );
  });

  it('counts a found row with no expiry and leaves it out of the file', () => {
    expect(
      buildPaidExpiryCsv(
        ['none', 'blank'],
        [
          queryRow({
            id_text: 'none',
            email: null,
            membership_expires_at: null,
          }),
          queryRow({
            id_text: 'blank',
            email: '   ',
            membership_expires_at: '   ',
          }),
        ],
        NOW
      )
    ).toEqual(expiryFile(HEADER, { noGrant: 2 }));
  });

  it('lists a requested id the query did not find', () => {
    expect(
      buildPaidExpiryCsv(
        ['gone', 'absent'],
        [
          queryRow({
            id_text: 'gone',
            email: 'gone@example.com',
            membership_expires_at: '2028-01-01T00:00:00Z',
            found: false,
          }),
        ],
        NOW
      )
    ).toEqual(expiryFile(HEADER, { missingIds: ['gone', 'absent'] }));
  });

  it('lists an expiry that is not a timestamp and leaves it out of the file', () => {
    expect(
      buildPaidExpiryCsv(
        ['bad-date'],
        [
          queryRow({
            id_text: 'bad-date',
            email: 'bad-date@example.com',
            membership_expires_at: 'not-a-date',
            beyond_five_years: true,
            app_store_window: true,
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile(HEADER, {
        invalidExpiry: 1,
        invalidExpiryIds: ['bad-date'],
      })
    );
  });

  it('lists an expiry whose email cannot be matched and leaves it out of the file', () => {
    expect(
      buildPaidExpiryCsv(
        ['bad'],
        [
          queryRow({
            id_text: 'bad',
            email: 'not-an-email',
            membership_expires_at: '2028-01-01T00:00:00Z',
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile(HEADER, {
        skippedInvalidEmail: 1,
        invalidEmailIds: ['bad'],
      })
    );
  });

  it('writes neither row when two expiries share one email', () => {
    expect(
      buildPaidExpiryCsv(
        ['upper', 'lower'],
        [
          queryRow({
            id_text: 'upper',
            email: 'User@Example.com',
            membership_expires_at: '2028-01-01T00:00:00Z',
          }),
          queryRow({
            id_text: 'lower',
            email: 'user@example.com',
            membership_expires_at: '2029-01-01T00:00:00Z',
          }),
        ],
        NOW
      )
    ).toEqual(expiryFile(HEADER, { ambiguousIds: ['upper', 'lower'] }));
  });

  it('writes the expiry row when the other email twin has no expiry', () => {
    expect(
      buildPaidExpiryCsv(
        ['empty', 'kept'],
        [
          queryRow({
            id_text: 'empty',
            email: 'User@Example.com',
            membership_expires_at: null,
          }),
          queryRow({
            id_text: 'kept',
            email: 'user@example.com',
            membership_expires_at: '2028-05-01T00:00:00Z',
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile('email,membership_expires_at\nuser@example.com,2028-05-01T00:00:00Z\n', {
        rowsWritten: 1,
        noGrant: 1,
        futureUncapped: 1,
        futureIds: ['kept'],
      })
    );
  });

  it('writes a header only when nothing was requested', () => {
    expect(
      buildPaidExpiryCsv(
        [],
        [
          queryRow({
            id_text: 'ignored',
            email: 'ignored@example.com',
          }),
        ],
        NOW
      )
    ).toEqual(expiryFile(HEADER));
  });

  it('quotes an email that contains a comma', () => {
    expect(
      buildPaidExpiryCsv(
        ['comma'],
        [
          queryRow({
            id_text: 'comma',
            email: 'a,b@example.com',
            membership_expires_at: '2028-01-01T00:00:00Z',
          }),
        ],
        NOW
      )
    ).toEqual(
      expiryFile('email,membership_expires_at\n"a,b@example.com",2028-01-01T00:00:00Z\n', {
        rowsWritten: 1,
        futureUncapped: 1,
        futureIds: ['comma'],
      })
    );
  });

  it('rejects an invalid clock', () => {
    expect(() => buildPaidExpiryCsv(['id'], [], new Date(Number.NaN))).toThrow(
      'Membership expiry rebuild needs a valid time.'
    );
  });
});
