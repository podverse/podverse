let listEndedHandler: (() => void) | null = null;

export function registerEmbedListEndedHandler(handler: (() => void) | null): void {
  listEndedHandler = handler;
}

export function notifyEmbedListItemEnded(): boolean {
  if (listEndedHandler !== null) {
    listEndedHandler();
    return true;
  }

  return false;
}
