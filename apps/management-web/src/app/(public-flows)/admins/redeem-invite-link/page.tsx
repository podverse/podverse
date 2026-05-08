import { RedeemAdminInviteLinkPageClient } from './RedeemAdminInviteLinkPageClient';

export default async function RedeemAdminInviteLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  return <RedeemAdminInviteLinkPageClient token={token} />;
}
