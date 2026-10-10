let blocked = false;
const listeners = new Set<() => void>();

export function termsBlocksAccountSync(): boolean {
  return blocked;
}

export function setTermsBlocksAccountSync(next: boolean): void {
  if (blocked === next) {
    return;
  }
  blocked = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeTermsBlocksAccountSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
