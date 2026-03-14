import { useTranslations } from 'next-intl';

import type { MetaBoost } from '@podverse/v4v-metaboost';

import { Link } from '../Link/Link';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type BoostMetaBoostInfoProps = {
  metaBoost: MetaBoost;
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const BoostMetaBoostInfo = ({ metaBoost }: BoostMetaBoostInfoProps) => {
  const tValue = useTranslations('value');

  return (
    <div className={styles.metaBoostInfo}>
      {metaBoost.node && (
        <div>
          {tValue.rich('meta_boost.message_receive', {
            domain: getDomainFromUrl(metaBoost.node),
            link: (chunks) => (
              <Link href={metaBoost.node ?? ''} target="_blank" rel="noopener noreferrer">
                {chunks}
              </Link>
            ),
          })}
        </div>
      )}
      <div>
        {metaBoost.license
          ? tValue.rich('meta_boost.terms_message', {
              link: (chunks) => (
                <Link href={metaBoost.license ?? ''} target="_blank" rel="noopener noreferrer">
                  {chunks}
                </Link>
              ),
            })
          : tValue('meta_boost.no_terms')}
      </div>
    </div>
  );
};
