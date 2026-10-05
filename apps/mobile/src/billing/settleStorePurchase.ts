import { billingErrorCode } from './billingGuards';

export type SettledStorePhase = 'confirmed' | 'failed' | 'unconfirmed' | 'waiting';

/**
 * Posts the purchase, then finishes the store transaction only when the API says every event
 * was recorded. Pending purchases are not posted and not finished.
 */
export const settleStorePurchase = async (params: {
  pending: boolean;
  post: () => Promise<{ confirmed: boolean }>;
  finish: () => Promise<void>;
}): Promise<{ errorCode: string | null; phase: SettledStorePhase }> => {
  if (params.pending) {
    return { errorCode: null, phase: 'waiting' };
  }

  try {
    const result = await params.post();
    if (result.confirmed !== true) {
      return { errorCode: null, phase: 'unconfirmed' };
    }
    await params.finish();
    return { errorCode: null, phase: 'confirmed' };
  } catch (error) {
    return { errorCode: billingErrorCode(error), phase: 'failed' };
  }
};
