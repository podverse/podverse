import { getTranslations } from 'next-intl/server';

import { EmbedDemoPreview } from '../../components/embed/EmbedDemoPreview';
import { getEmbedLayoutType } from '../../lib/embed/getEmbedLayoutType';
import { resolveEmbedDemoShowcase } from '../../lib/embed/resolveEmbedDemoShowcase';

import styles from './EmbedIndexPage.module.scss';

export default async function EmbedPage() {
  const t = await getTranslations('features');
  const showcase = await resolveEmbedDemoShowcase();

  const singleShowcase = showcase.filter(
    (entry) => getEmbedLayoutType(entry.routeKind) === 'single'
  );
  const listShowcase = showcase.filter(
    (entry) => getEmbedLayoutType(entry.routeKind) === 'list'
  );

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t('embed_demo_page_title')}</h1>
      <p className={styles.lead}>{t('embed_demo_page_lead')}</p>

      <section className={styles.section} aria-labelledby="embed-demo-single-heading">
        <h2 className={styles.sectionTitle} id="embed-demo-single-heading">
          {t('embed_demo_single_section_title')}
        </h2>
        <div className={styles.showcaseGrid}>
          {singleShowcase.map((entry) => (
            <EmbedDemoPreview
              key={entry.showcaseId}
              href={entry.href}
              label={entry.label}
              note={entry.note}
              routeKind={entry.routeKind}
              showcaseId={entry.showcaseId}
            />
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="embed-demo-list-heading">
        <h2 className={styles.sectionTitle} id="embed-demo-list-heading">
          {t('embed_demo_list_section_title')}
        </h2>
        <div className={styles.showcaseGrid}>
          {listShowcase.map((entry) => (
            <EmbedDemoPreview
              key={entry.showcaseId}
              href={entry.href}
              label={entry.label}
              note={entry.note}
              routeKind={entry.routeKind}
              showcaseId={entry.showcaseId}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
