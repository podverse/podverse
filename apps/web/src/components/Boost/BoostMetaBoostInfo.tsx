import { useTranslations } from 'next-intl';

import { Link } from '../Link/Link';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type BoostMetaBoostInfoProps = {
  boostNodeUrl: string;
  termsOfServiceUrl: string | null;
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const BoostMetaBoostInfo = ({
  boostNodeUrl,
  termsOfServiceUrl,
}: BoostMetaBoostInfoProps) => {
  const tValue = useTranslations('value');

  return (
    <div className={styles.metaBoostInfo}>
      {boostNodeUrl !== '' && (
        <div>
          {tValue.rich('meta_boost.message_receive', {
            domain: getDomainFromUrl(boostNodeUrl),
            link: (chunks) => (
              <Link href={boostNodeUrl} target="_blank" rel="noopener noreferrer">
                {chunks}
              </Link>
            ),
          })}
        </div>
      )}
      <div>
        {termsOfServiceUrl !== null && termsOfServiceUrl !== ''
          ? tValue.rich('meta_boost.terms_message', {
              link: (chunks) => (
                <Link href={termsOfServiceUrl} target="_blank" rel="noopener noreferrer">
                  {chunks}
                </Link>
              ),
            })
          : tValue('meta_boost.no_terms')}
      </div>
    </div>
  );
};
