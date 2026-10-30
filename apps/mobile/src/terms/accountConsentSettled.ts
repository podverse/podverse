let settled = false;
const listeners = new Set<() => void>();

/**
 * True while a signed-in account has its snapshot and no Terms, account access, or Taste Profile
 * screen is up or still deciding whether to come up. Prompts that follow a sign-in wait for it so
 * they never open beneath that full-screen screen.
 */
export function isAccountConsentSettled(): boolean {
  return settled;
}

export function setAccountConsentSettled(next: boolean): void {
  if (settled === next) {
    return;
  }
  settled = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAccountConsentSettled(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
