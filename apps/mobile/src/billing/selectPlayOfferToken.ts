/** One Play subscription offer as returned on `subscriptionOfferDetails`. */
export type PlaySubscriptionOffer = {
  basePlanId: string;
  /** Null or empty for the base-plan offer; set for a promotional offer. */
  offerId: string | null;
  offerToken: string;
};

const hasOfferToken = (offer: PlaySubscriptionOffer): boolean => offer.offerToken !== '';

const isBaseOffer = (offer: PlaySubscriptionOffer): boolean =>
  offer.offerId === null || offer.offerId === '';

/**
 * Picks the offer token for a Play purchase. When `basePlanId` is set, only that base plan is
 * eligible and the base-plan offer (no promo `offerId`) is preferred. When it is null, the first
 * offer with a token is used (Apple and non-subscription paths do not send a base plan id).
 */
export const selectPlayOfferToken = (
  offers: readonly PlaySubscriptionOffer[],
  basePlanId: string | null
): string | null => {
  const eligible =
    basePlanId === null
      ? offers.filter(hasOfferToken)
      : offers.filter((offer) => offer.basePlanId === basePlanId && hasOfferToken(offer));
  if (eligible.length === 0) {
    return null;
  }
  const baseOffer = eligible.find(isBaseOffer);
  return (baseOffer ?? eligible[0])?.offerToken ?? null;
};
