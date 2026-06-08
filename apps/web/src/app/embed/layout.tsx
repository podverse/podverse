import { EmbedPlaybackModeProvider } from '../../contexts/EmbedPlaybackMode';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';

export const metadata = buildNoindexMetadata('Embed');

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmbedPlaybackModeProvider>
      <div data-testid="embed-root">{children}</div>
    </EmbedPlaybackModeProvider>
  );
}
