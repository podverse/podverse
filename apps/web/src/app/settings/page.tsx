import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { SettingsClient } from './SettingsClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function SettingsPage() {
  return <SettingsClient />;
}
