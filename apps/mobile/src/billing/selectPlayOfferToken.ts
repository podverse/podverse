/** One Play subscription offer as returned on `subscriptionOfferDetails`. */
export type PlaySubscriptionOffer = {
  basePlanId: string | null;
  id: string | null;
  /** Null or empty for the base-plan offer; set for a promotional offer. */
  offerId: string | null;
  offerToken: string;
};

const hasOfferToken = (offer: PlaySubscriptionOffer): boolean => offer.offerToken !== '';

const isBaseOffer = (offer: PlaySubscriptionOffer): boolean =>
  offer.offerId === null || offer.offerId === '';

const normalizeOffer = (offer: unknown): PlaySubscriptionOffer | null => {
  if (typeof offer !== 'object' || offer === null) {
    return null;
  }
  const record = offer as Record<string, unknown>;
  const basePlanIdRaw = record.basePlanIdAndroid ?? record.basePlanId;
  const idRaw = record.id;
  const offerIdRaw = record.offerIdAndroid ?? record.offerId;
  const offerTokenRaw = record.offerTokenAndroid ?? record.offerToken;
  if (typeof offerTokenRaw !== 'string' || offerTokenRaw === '') {
    return null;
  }
  return {
    basePlanId: typeof basePlanIdRaw === 'string' && basePlanIdRaw !== '' ? basePlanIdRaw : null,
    id: typeof idRaw === 'string' && idRaw !== '' ? idRaw : null,
    offerId: typeof offerIdRaw === 'string' && offerIdRaw !== '' ? offerIdRaw : null,
    offerToken: offerTokenRaw,
  };
};

/**
 * Picks the offer token for a Play purchase. When `basePlanId` is set, only that base plan is
 * eligible and the base-plan offer (no promo `offerId`) is preferred. When it is null, the first
 * offer with a token is used (Apple and non-subscription paths do not send a base plan id).
 */
export const selectPlayOfferToken = (
  offers: readonly unknown[],
  basePlanId: string | null
): string | null => {
  const normalizedOffers = offers
    .map((offer) => normalizeOffer(offer))
    .filter((offer): offer is PlaySubscriptionOffer => offer !== null);
  const eligible =
    basePlanId === null
      ? normalizedOffers.filter(hasOfferToken)
      : normalizedOffers.filter((offer) => offer.basePlanId === basePlanId && hasOfferToken(offer));
  if (eligible.length === 0) {
    return null;
  }
  const baseOffer = eligible.find(isBaseOffer);
  return (baseOffer ?? eligible[0])?.offerToken ?? null;
};

/**
 * Offer token for a prepaid Play base plan. Null when the base plan id is missing or Play has
 * no offer for it, so the purchase fails closed instead of charging some other offer.
 */
export const resolvePrepaidPlayOffer = (
  offers: readonly unknown[],
  basePlanId: string | null
): string | null => {
  if (basePlanId === null || basePlanId === '') {
    return null;
  }
  return selectPlayOfferToken(offers, basePlanId);
};
