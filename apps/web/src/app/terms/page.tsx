import { getTranslations } from 'next-intl/server';

import { MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getConfig } from '../../config';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('terms');
}

export default async function TermsPage() {
  const t = await getTranslations('terms');
  const config = getConfig();

  const i18nVars = {
    legal_name: config.public.legal.name,
    brand_name: config.public.brand.name,
    brand_domain: config.public.brand.domain,
    retention_days: config.public.stats.trackEventRetentionDays,
    contact_email: config.public.contact.email,
  };

  return (
    <>
      <MainHeader title={t('terms')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <section>
              <h2>{t('legal_entity_heading', { legal_name: i18nVars.legal_name })}</h2>
              <p>{t('service_intro', i18nVars)}</p>
            </section>

            <section>
              <p>{t('never_sell_data', i18nVars)}</p>
              <p>{t('no_ads_without_permission')}</p>
              <p>{t('audio_video_hosting', i18nVars)}</p>
              <p>{t('third_party_feeds')}</p>
              <p>{t('clips_crowdsourced', i18nVars)}</p>
              <p>{t('clips_load_full_episode')}</p>
              <p>{t('reduced_size_images')}</p>
            </section>

            <section>
              <p>{t('data_service_necessary', i18nVars)}</p>
              <h2>{t('data_listen_stats_heading')}</h2>
              <p>{t('data_listen_stats_body', i18nVars)}</p>
              <p>{t('data_listen_stats_anonymization')}</p>
              <p>{t('data_web_analytics', i18nVars)}</p>
              <p>{t('data_retention', i18nVars)}</p>
              <p>{t('data_requests', i18nVars)}</p>
            </section>

            <section>
              <h2>{t('cookie_choices_heading')}</h2>
              <ul>
                <li>
                  <strong>{t('cookie_choice_all')}</strong> — {t('cookie_choice_all_help')}
                </li>
                <li>
                  <strong>{t('cookie_choice_essential')}</strong> —{' '}
                  {t('cookie_choice_essential_help')}
                </li>
                <li>
                  <strong>{t('cookie_choice_none')}</strong> — {t('cookie_choice_none_help')}
                </li>
              </ul>
            </section>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
