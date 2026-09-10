import classNames from 'classnames';
import { FaCircleCheck } from 'react-icons/fa6';

import styles from './FeatureComparison.module.scss';

export type FeatureComparisonTier = {
  id: string;
  name: string;
};

export type FeatureComparisonRow = {
  name: string;
  available: Record<string, boolean>;
  comingSoon?: boolean;
  mobileOnly?: boolean;
};

export type FeatureComparisonProps = {
  tiers: FeatureComparisonTier[];
  features: FeatureComparisonRow[];
  labels: {
    feature: string;
    available: string;
    comingSoon: string;
    mobileOnlyLegend: string;
  };
  className?: string;
};

export function FeatureComparison({ tiers, features, labels, className }: FeatureComparisonProps) {
  const showMobileLegend = features.some(
    (feature) => feature.comingSoon !== true && feature.mobileOnly === true
  );

  return (
    <div className={classNames(styles.comparison, className)}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.featureHeader}>{labels.feature}</th>
            {tiers.map((tier) => (
              <th key={tier.id} className={styles.tierHeader}>
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={index} className={styles.row}>
              <td className={styles.featureCell}>{feature.name}</td>
              {feature.comingSoon === true ? (
                <td
                  aria-label={`${feature.name}: ${labels.comingSoon}`}
                  className={styles.comingSoonCell}
                  colSpan={tiers.length}
                >
                  {labels.comingSoon}
                </td>
              ) : (
                tiers.map((tier) => {
                  const isAvailable = feature.available[tier.id] === true;

                  return (
                    <td key={tier.id} className={styles.tierCell}>
                      {isAvailable ? (
                        <span aria-label={labels.available} className={styles.tierStatus}>
                          <FaCircleCheck aria-hidden className={styles.checkmark} />
                        </span>
                      ) : null}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {showMobileLegend ? <p className={styles.legend}>* {labels.mobileOnlyLegend}</p> : null}
    </div>
  );
}
