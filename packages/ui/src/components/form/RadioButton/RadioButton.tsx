import classNames from 'classnames';

import styles from './RadioButton.module.scss';

export type RadioButtonOption = {
  label: string;
  value: string;
};

export type RadioButtonProps = {
  eyebrow?: string;
  options: RadioButtonOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
  name: string;
};

export function RadioButton({
  eyebrow,
  options,
  selectedValue,
  onChange,
  className,
  name,
}: RadioButtonProps) {
  const handleRadioChange = (value: string) => {
    onChange(value);
  };

  return (
    <div className={classNames(styles.root, className)}>
      {eyebrow !== undefined && eyebrow !== '' ? (
        <div className={styles.eyebrow}>{eyebrow}</div>
      ) : null}
      <div className={styles.optionsWrapper}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => {
                handleRadioChange(option.value);
              }}
              className={styles.radio}
            />
            <span className={styles.label}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
