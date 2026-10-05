import { MembershipStoreCheckout } from '../../components/membership/MembershipStoreCheckout';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';

/**
 * Extend Membership. Cadence, terms, privacy, and auto-renew live here. The purchase posts
 * through the store billing client. The Membership screen only shows how long access lasts.
 */
export function MoreMembershipExtendScreen() {
  return (
    <MobileScreenContainer testID="membership-extend-screen">
      <MembershipStoreCheckout />
    </MobileScreenContainer>
  );
}
