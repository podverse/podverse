/** Thrown after capability preflight fails and offline prompt has already been shown. */
export class MetaboostCapabilityPreflightError extends Error {
  constructor() {
    super('MetaBoost capability preflight failed');
    this.name = 'MetaboostCapabilityPreflightError';
  }
}
