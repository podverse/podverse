import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { MainHeader } from '../../../components/Main/MainHeader';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';

import styles from '../../../styles/app/v4v/BoostMessages.module.scss';

export default async function BoostMessagesPage() {
  const t = await getTranslations('v4v');

  return (
    <>
      <MainHeader title={t('boost_messages.title')} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <section>
              <p>{t('boost_messages.description')}</p>
              <h2 className={styles.exampleHeading}>{t('boost_messages.example_heading')}</h2>
              <pre className={styles.exampleBlock}>
                <code>{t('boost_messages.example')}</code>
              </pre>
              <p>
                <Link href={t('boost_messages.boostbox_url')} target="_blank">
                  {t('boost_messages.boostbox_label')}
                </Link>
              </p>
            </section>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
