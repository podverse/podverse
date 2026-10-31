const SETTINGS_NAVIGATION_KEY = 'podverse.settings.navigation';

const SETTINGS_TAB_PATHS = new Set([
  '/settings',
  '/settings?tab=account',
  '/settings?tab=advanced',
  '/settings?tab=developer',
  '/settings?tab=general',
  '/settings?tab=keyboard',
  '/settings?tab=notifications',
  '/settings?tab=opml',
  '/settings?tab=profile',
  '/settings?tab=recommendations',
]);

function isSettingsTabPath(path: string): boolean {
  return SETTINGS_TAB_PATHS.has(path);
}

/** The settings tab a click chose, kept so a session-ended reload can still open it. */
export function rememberSettingsNavigation(path: string): void {
  if (!isSettingsTabPath(path)) {
    return;
  }
  try {
    sessionStorage.setItem(SETTINGS_NAVIGATION_KEY, path);
  } catch {
    // sessionStorage can be disabled.
  }
}

/** Drops the remembered tab once the address is already that tab. */
export function clearSettingsNavigationIfCurrent(path: string): void {
  try {
    if (sessionStorage.getItem(SETTINGS_NAVIGATION_KEY) === path) {
      sessionStorage.removeItem(SETTINGS_NAVIGATION_KEY);
    }
  } catch {
    // sessionStorage can be disabled.
  }
}

/** The remembered settings tab, consumed once. Null when none or not a settings tab. */
export function takeSettingsNavigation(): string | null {
  try {
    const path = sessionStorage.getItem(SETTINGS_NAVIGATION_KEY);
    sessionStorage.removeItem(SETTINGS_NAVIGATION_KEY);
    if (path !== null && isSettingsTabPath(path)) {
      return path;
    }
    return null;
  } catch {
    return null;
  }
}

/** Opens the settings tab a click already chose, or reloads the current page. */
export function moveBrowserAfterSignOut(): void {
  const path = takeSettingsNavigation();
  if (path !== null) {
    window.location.assign(path);
    return;
  }
  window.location.reload();
}
