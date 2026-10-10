import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { AccountAccessClient } from './AccountAccessClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function AccountAccessPage() {
  return <AccountAccessClient />;
}
