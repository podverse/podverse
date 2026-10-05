'use client';

import classNames from 'classnames';

import styles from './MembershipPlanSelector.module.scss';

export type MembershipPlanOption = {
  value: string;
  label: string;
  price: string;
  period: string;
  savingsLabel?: string;
};

export type MembershipPlanSelectorProps = {
  name: string;
  legend: string;
  options: MembershipPlanOption[];
  selectedValue: string;
  onChange: (value: string) => void;
};

export function MembershipPlanSelector({
  name,
  legend,
  options,
  selectedValue,
  onChange,
}: MembershipPlanSelectorProps) {
  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options} role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <label
              key={option.value}
              className={classNames(styles.option, selected ? styles.optionSelected : null)}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => {
                  onChange(option.value);
                }}
                className={styles.radio}
              />
              <span className={styles.label}>{option.label}</span>
              {option.price !== '' ? (
                <span className={styles.price}>
                  {option.price}
                  {option.period !== '' ? (
                    <span className={styles.period}>{option.period}</span>
                  ) : null}
                </span>
              ) : null}
              {option.savingsLabel !== undefined && option.savingsLabel !== '' ? (
                <span className={styles.savings}>{option.savingsLabel}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
