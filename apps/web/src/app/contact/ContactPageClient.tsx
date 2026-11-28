'use client';

import { useTranslations } from 'next-intl';

import { Divider, MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { Link } from '../../components/Link/Link';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { contactEmailLinks } from '../../constants/contact';
import { SOCIALS } from '../../constants/socials';
import { useConfig } from '../../contexts/Config';

import styles from '../../styles/app/contact/Contact.module.scss';

export const ContactPageClient = () => {
  const tContact = useTranslations('contact');
  const config = useConfig();
  const emailLinks = contactEmailLinks(config.public.contact.email, config.public.brand.name);

  return (
    <>
      <MainHeader title={tContact('contact')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <section className={styles.section}>
              <h2>{tContact('email')}</h2>
              <ul>
                <li>
                  <Link href={emailLinks.BUG_REPORT} fullPageLoad>
                    {tContact('report_bug')}
                  </Link>
                </li>
                <li>
                  <Link href={emailLinks.FEATURE_REQUEST} fullPageLoad>
                    {tContact('feature_request')}
                  </Link>
                </li>
                <li>
                  <Link href={emailLinks.PODCAST_REQUEST} fullPageLoad>
                    {tContact('podcast_request')}
                  </Link>
                </li>
                <li>
                  <Link href={emailLinks.CONTENT_ISSUE} fullPageLoad>
                    {tContact('report_content_issue')}
                  </Link>
                </li>
                <li>
                  <Link href={emailLinks.GENERAL} fullPageLoad>
                    {tContact('general')}
                  </Link>
                </li>
              </ul>
            </section>
            <Divider className={styles.divider} />
            <section className={styles.section}>
              <h2>{tContact('live_chat')}</h2>
              <ul>
                <li>
                  <Link
                    href={SOCIALS.MATRIX}
                    fullPageLoad
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tContact('join_matrix_space')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={SOCIALS.DISCORD}
                    fullPageLoad
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tContact('chat_discord')}
                  </Link>
                </li>
              </ul>
            </section>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
