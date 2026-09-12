import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { PopularityTrackingGateClient } from './PopularityTrackingGateClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function PopularityTrackingGatePage() {
  return <PopularityTrackingGateClient />;
}
