import { describe, expect, it } from 'vitest';

import {
  chosenFolderSwitchState,
  isChosenFolderDocumentUri,
  safCreateMimeType,
  sumChosenFolderBytes,
} from './chosenDownloadFolder';

describe('chosenFolderSwitchState', () => {
  it('hides the switch on iOS', () => {
    expect(
      chosenFolderSwitchState({ folderKind: 'saf_tree', platform: 'ios', pref: null })
    ).toEqual({ enabled: false, visible: false });
    expect(
      chosenFolderSwitchState({ folderKind: 'saf_tree', platform: 'ios', pref: 'true' })
    ).toEqual({ enabled: false, visible: false });
  });

  it('hides the switch when the saved folder is not a writable tree', () => {
    for (const folderKind of [null, 'path', 'unsupported'] as const) {
      expect(chosenFolderSwitchState({ folderKind, platform: 'android', pref: 'true' })).toEqual({
        enabled: false,
        visible: false,
      });
    }
  });

  it('shows the switch on for an Android tree unless the pref is exactly false', () => {
    for (const pref of [null, '', 'true'] as const) {
      expect(
        chosenFolderSwitchState({ folderKind: 'saf_tree', platform: 'android', pref })
      ).toEqual({ enabled: true, visible: true });
    }
    expect(
      chosenFolderSwitchState({ folderKind: 'saf_tree', platform: 'android', pref: 'false' })
    ).toEqual({ enabled: false, visible: true });
    expect(
      chosenFolderSwitchState({ folderKind: 'saf_tree', platform: 'android', pref: 'FALSE' })
    ).toEqual({ enabled: true, visible: true });
  });
});

describe('isChosenFolderDocumentUri', () => {
  it('accepts a content URI and rejects a file name, a file URL, and an empty string', () => {
    expect(
      isChosenFolderDocumentUri(
        'content://com.android.externalstorage.documents/document/primary%3Aep.mp3'
      )
    ).toBe(true);
    expect(isChosenFolderDocumentUri('itemABC.mp3')).toBe(false);
    expect(isChosenFolderDocumentUri('file:///docs/downloads/itemABC.mp3')).toBe(false);
    expect(isChosenFolderDocumentUri('')).toBe(false);
  });
});

describe('safCreateMimeType', () => {
  it('uses a clean enclosure type, then the extension, then a generic type', () => {
    expect(safCreateMimeType('m4a', 'audio/mpeg; charset=binary')).toBe('audio/mpeg');
    expect(safCreateMimeType('m4a', '')).toBe('audio/mp4');
    expect(safCreateMimeType('bin', null)).toBe('application/octet-stream');
  });
});

describe('sumChosenFolderBytes', () => {
  it('sums completed document URIs and ignores every other row', () => {
    expect(
      sumChosenFolderBytes([
        { byteSize: 120, filePath: 'content://doc/a', status: 'complete' },
        { byteSize: 30, filePath: 'content://doc/b', status: 'complete' },
        { byteSize: 50, filePath: 'itemABC.mp3', status: 'complete' },
        { byteSize: 80, filePath: 'content://doc/c', status: 'downloading' },
        { byteSize: null, filePath: 'content://doc/d', status: 'complete' },
      ])
    ).toBe(150);
  });
});
