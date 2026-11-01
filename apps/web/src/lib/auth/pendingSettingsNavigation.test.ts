import { afterEach, describe, expect, it } from 'vitest';

import {
  clearSettingsNavigationIfCurrent,
  rememberSettingsNavigation,
  takeSettingsNavigation,
} from './pendingSettingsNavigation';

describe('pending settings navigation', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('keeps a settings tab until sign-out consumes it', () => {
    rememberSettingsNavigation('/settings');
    expect(sessionStorage.getItem('podverse.settings.navigation')).toBe('/settings');

    clearSettingsNavigationIfCurrent('/settings?tab=account');
    expect(takeSettingsNavigation()).toBe('/settings');
    expect(takeSettingsNavigation()).toBeNull();
  });

  it('drops the remembered tab once the address is already that tab', () => {
    rememberSettingsNavigation('/settings?tab=account');
    clearSettingsNavigationIfCurrent('/settings?tab=account');
    expect(takeSettingsNavigation()).toBeNull();
  });

  it('ignores a path that is not a settings tab', () => {
    rememberSettingsNavigation('/podcasts');
    expect(takeSettingsNavigation()).toBeNull();
  });
});
