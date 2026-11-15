import { v4CarryoverRepository } from '../../data/repositories/v4CarryoverRepository';
import { buildCarryoverOutlines, carryoverOutlineCount } from './carryoverOutlines';

/**
 * One offer per signed-out stretch. Signing in clears it so the next sign-out can offer again.
 * A second call while the first is still reading does not open a second screen.
 */
let offeredThisStretch = false;
let offerInFlight = false;

export const resetV4ContinueMigrationOffer = (): void => {
  offeredThisStretch = false;
};

/**
 * Open the save screen when this phone is signed out, the read has finished, the copy is not
 * yet allowed, and at least one staged row can be an outline.
 */
export const tryOfferV4ContinueMigration = async (
  signedOut: () => boolean,
  open: () => Promise<boolean>
): Promise<void> => {
  if (!signedOut() || offeredThisStretch || offerInFlight) {
    return;
  }
  offerInFlight = true;
  try {
    if (!(await v4CarryoverRepository.hasRead())) {
      return;
    }
    if (!signedOut() || (await v4CarryoverRepository.isCopyAllowed())) {
      return;
    }
    const rows = await v4CarryoverRepository.listOutlineSources();
    if (!signedOut() || offeredThisStretch) {
      return;
    }
    if (carryoverOutlineCount(buildCarryoverOutlines(rows)) === 0) {
      return;
    }
    if (await open()) {
      offeredThisStretch = true;
    }
  } finally {
    offerInFlight = false;
  }
};
