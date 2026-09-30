import { isRecord } from './billingGuards';

/** Play Billing `PurchaseState.PENDING`. A pending purchase is not finished and not posted. */
const PLAY_PURCHASE_PENDING = 2;

export type NormalizedStorePurchase = {
  pending: boolean;
  productId: string;
  purchaseToken: string | null;
  /** StoreKit JWS for an iOS transaction; null on Android. */
  signedTransaction: string | null;
  transactionId: string | null;
};

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value !== '' ? value : null;
};

export const normalizeStorePurchase = (value: unknown): NormalizedStorePurchase | null => {
  if (!isRecord(value)) {
    return null;
  }
  const productId = readString(value, 'id');
  if (productId === null) {
    return null;
  }
  return {
    pending: value.purchaseStateAndroid === PLAY_PURCHASE_PENDING,
    productId,
    purchaseToken: readString(value, 'purchaseTokenAndroid'),
    signedTransaction: readString(value, 'jwsRepresentationIos'),
    transactionId: readString(value, 'transactionId'),
  };
};
