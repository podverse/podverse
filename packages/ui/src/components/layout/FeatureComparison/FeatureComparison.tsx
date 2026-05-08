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
};

export type FeatureComparisonProps = {
  tiers: FeatureComparisonTier[];
  features: FeatureComparisonRow[];
  labels: {
    feature: string;
    available: string;
  };
  className?: string;
};

export function FeatureComparison({ tiers, features, labels, className }: FeatureComparisonProps) {
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
              {tiers.map((tier) => (
                <td key={tier.id} className={styles.tierCell}>
                  {feature.available[tier.id] === true && (
                    <FaCircleCheck className={styles.checkmark} aria-label={labels.available} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
