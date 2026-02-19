import { useTranslations } from 'next-intl';

import type { MetaBoost } from '@podverse/helpers-v4v';

import styles from '../../styles/components/Boost/BoostForm.module.scss';

type BoostMetaBoostInfoProps = {
  metaBoost: MetaBoost;
};

export const BoostMetaBoostInfo = ({ metaBoost }: BoostMetaBoostInfoProps) => {
  const tValue = useTranslations('value');

  return (
    <div className={styles.metaBoostInfo}>
      <strong>{tValue('meta_boost.title')}</strong>
      <div>
        {tValue('meta_boost.type_label')} {metaBoost.type}
      </div>
      <div>
        {tValue('meta_boost.schema_label')} {metaBoost.schema}
      </div>
      {metaBoost.license && (
        <div>
          {tValue('meta_boost.license_label')}{' '}
          <a href={metaBoost.license} target="_blank" rel="noopener noreferrer">
            {metaBoost.license}
          </a>
        </div>
      )}
      <div>
        {tValue('meta_boost.node_label')}{' '}
        <a href={metaBoost.node} target="_blank" rel="noopener noreferrer">
          {metaBoost.node}
        </a>
      </div>
    </div>
  );
};
