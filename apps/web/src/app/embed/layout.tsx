import { EmbedPlaybackModeProvider } from '../../contexts/EmbedPlaybackMode';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';

import styles from './EmbedLayout.module.scss';

export const metadata = buildNoindexMetadata('Embed');

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmbedPlaybackModeProvider>
      <div className={styles.embedRoot} data-testid="embed-root">
        {children}
      </div>
    </EmbedPlaybackModeProvider>
  );
}
