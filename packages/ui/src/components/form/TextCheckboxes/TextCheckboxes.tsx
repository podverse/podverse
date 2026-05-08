import classNames from 'classnames';

import styles from './TextCheckboxes.module.scss';

export type TextCheckboxOption = {
  label: string;
  value: string;
};

export type TextCheckboxesProps = {
  eyebrow?: string;
  options: TextCheckboxOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  className?: string;
  name: string;
};

export function TextCheckboxes({
  eyebrow,
  options,
  selectedValues,
  onChange,
  className,
  name,
}: TextCheckboxesProps) {
  const handleCheckboxChange = (value: string) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange(newSelectedValues);
  };

  return (
    <div className={classNames(styles.textCheckboxes, className)}>
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      <div className={styles.optionsWrapper}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={selectedValues.includes(option.value)}
              onChange={() => handleCheckboxChange(option.value)}
              className={styles.checkbox}
            />
            <span className={styles.label}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
