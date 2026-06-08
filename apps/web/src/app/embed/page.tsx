import { getTranslations } from 'next-intl/server';

import { Divider, MainColumnStack, MainSidebarLayout, TableOfContents } from '@podverse/ui';

import { EmbedDemoPageIntro } from '../../components/embed/EmbedDemoPageIntro';
import { EmbedDemoPreview } from '../../components/embed/EmbedDemoPreview';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { buildEmbedDemoTocSections } from '../../lib/embed/buildEmbedDemoTocItems';
import { getEmbedLayoutType } from '../../lib/embed/getEmbedLayoutType';
import { resolveEmbedDemoShowcase } from '../../lib/embed/resolveEmbedDemoShowcase';

import styles from './EmbedIndexPage.module.scss';

export default async function EmbedPage() {
  const t = await getTranslations('features');
  const showcase = await resolveEmbedDemoShowcase();

  const singleShowcase = showcase.filter(
    (entry) => getEmbedLayoutType(entry.routeKind) === 'single'
  );
  const listShowcase = showcase.filter((entry) => getEmbedLayoutType(entry.routeKind) === 'list');
  const tocSections = buildEmbedDemoTocSections({
    singleShowcase,
    listShowcase,
    singleSectionLabel: t('embed_demo_single_section_title'),
    listSectionLabel: t('embed_demo_list_section_title'),
  });

  return (
    <MainWrapper>
      <MainSidebarLayout>
        <MainColumnStack>
          <div className={styles.embedDemos}>
            <div className={styles.introStack}>
              <h1>{t('embed_demo_page_title')}</h1>
              <EmbedDemoPageIntro />

              <TableOfContents
                className={styles.tableOfContents}
                heading={t('embed_demo_toc_heading')}
                navAriaLabel={t('embed_demo_toc_nav_aria_label')}
                sections={tocSections}
              />
            </div>

            <Divider className={styles.tocDivider} />

            <section className={styles.section} aria-labelledby="embed-demo-single-heading">
              <h2 id="embed-demo-single-heading">{t('embed_demo_single_section_title')}</h2>
              <div className={styles.showcaseGrid}>
                {singleShowcase.map((entry) => (
                  <EmbedDemoPreview
                    key={entry.showcaseId}
                    href={entry.href}
                    label={entry.label}
                    routeKind={entry.routeKind}
                    showcaseId={entry.showcaseId}
                  />
                ))}
              </div>
            </section>

            <Divider className={styles.sectionDivider} />

            <section className={styles.section} aria-labelledby="embed-demo-list-heading">
              <h2 id="embed-demo-list-heading">{t('embed_demo_list_section_title')}</h2>
              <div className={styles.showcaseGrid}>
                {listShowcase.map((entry) => (
                  <EmbedDemoPreview
                    key={entry.showcaseId}
                    href={entry.href}
                    label={entry.label}
                    routeKind={entry.routeKind}
                    showcaseId={entry.showcaseId}
                  />
                ))}
              </div>
            </section>
          </div>
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
