import { describe, expect, it } from 'vitest';

import { extractNotificationTargetPath } from './notificationTarget';

describe('extractNotificationTargetPath', () => {
  it('prefers url when present', () => {
    expect(
      extractNotificationTargetPath({
        id_text: 'pod123',
        type: 'podcast',
        url: 'podverse-next://podcast/override123',
      })
    ).toBe('podverse-next://podcast/override123');
  });

  it('maps valid {type, id_text} payloads', () => {
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: 'podcast' })).toBe(
      '/podcast/pod123'
    );
    expect(extractNotificationTargetPath({ id_text: 'ep123', type: 'episode' })).toBe(
      '/episode/ep123'
    );
    expect(extractNotificationTargetPath({ id_text: 'clip123', type: 'clip' })).toBe(
      '/clip/clip123'
    );
    expect(extractNotificationTargetPath({ id_text: 'pl123', type: 'playlist' })).toBe(
      '/playlist/pl123'
    );
    expect(extractNotificationTargetPath({ id_text: 'user123', type: 'profile' })).toBe(
      '/profile/user123'
    );
  });

  it('returns null for unknown type', () => {
    expect(extractNotificationTargetPath({ id_text: 'whatever', type: 'unknown' })).toBeNull();
  });

  it('returns null for missing, empty, or whitespace values', () => {
    expect(extractNotificationTargetPath(null)).toBeNull();
    expect(extractNotificationTargetPath(undefined)).toBeNull();
    expect(extractNotificationTargetPath({})).toBeNull();
    expect(extractNotificationTargetPath({ id_text: '', type: 'podcast' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: '' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: '   ', type: 'podcast' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: '   ' })).toBeNull();
    expect(extractNotificationTargetPath({ url: '   ' })).toBeNull();
  });

  it('returns null for non-string values', () => {
    expect(extractNotificationTargetPath({ id_text: 123, type: 'podcast' })).toBeNull();
    expect(extractNotificationTargetPath({ id_text: 'pod123', type: 123 })).toBeNull();
    expect(extractNotificationTargetPath({ url: 123 })).toBeNull();
  });
});
