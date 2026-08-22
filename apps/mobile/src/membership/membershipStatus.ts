// Membership-state derivation now lives in `@podverse/helpers` (`deriveMembershipState`) so web and
// mobile/tablet share one implementation; this module keeps the mobile-named aliases for call sites.
// The RN-coupled reader stays in `useMembership.ts`. Unit tests live in
// `packages/helpers/src/lib/accountMembership.test.ts`.
export { deriveMembershipState } from '@podverse/helpers';
export type {
  MembershipState as MobileMembershipState,
  MembershipTier as MobileMembershipTier,
} from '@podverse/helpers';
