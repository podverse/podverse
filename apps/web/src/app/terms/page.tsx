import { getTranslations } from 'next-intl/server';

import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { SideContent } from '../../components/SideContent/SideContent';
import { getConfig } from '../../config';

export default async function TermsPage() {
  const t = await getTranslations('terms');
  const config = getConfig();

  return (
    <>
      <MainHeader title={t('terms')} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <section>
              <p>{t('never_sell_data', { brand_name: config.public.brand.name })}</p>
              <br />
              <p>{t('no_ads_without_permission')}</p>
              <br />
              <p>{t('audio_video_hosting', { brand_domain: config.public.brand.domain })}</p>
              <br />
              <p>{t('third_party_feeds')}</p>
              <br />
              <p>{t('clips_crowdsourced', { brand_domain: config.public.brand.domain })}</p>
              <br />
              <p>{t('clips_load_full_episode')}</p>
              <br />
              <p>{t('reduced_size_images')}</p>
            </section>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
