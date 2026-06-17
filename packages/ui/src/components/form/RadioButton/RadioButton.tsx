'use client';

import classNames from 'classnames';
import { FaCircleQuestion } from 'react-icons/fa6';

import { PopoverIcon } from '../../feedback/PopoverIcon/PopoverIcon';

import styles from './RadioButton.module.scss';

export type RadioButtonOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type RadioButtonLayout = 'horizontal' | 'vertical';

type RadioButtonBaseProps = {
  eyebrow?: string;
  options: RadioButtonOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
  name: string;
  /** @default 'horizontal' */
  layout?: RadioButtonLayout;
};

export type RadioButtonProps = RadioButtonBaseProps &
  (
    | { help?: undefined; helpAriaLabel?: undefined }
    | { help: string; helpAriaLabel: string }
  );

export function RadioButton({
  eyebrow,
  help,
  helpAriaLabel,
  options,
  selectedValue,
  onChange,
  className,
  name,
  layout = 'horizontal',
}: RadioButtonProps) {
  const handleRadioChange = (value: string) => {
    onChange(value);
  };

  const optionsWrapperClassName =
    layout === 'vertical' ? styles.optionsWrapperVertical : styles.optionsWrapperHorizontal;
  const showHelpPopover = help !== undefined && help !== '' && helpAriaLabel !== undefined;

  return (
    <div className={classNames(styles.root, className)}>
      {eyebrow !== undefined && eyebrow !== '' ? (
        <div className={styles.eyebrowRow}>
          <div className={styles.eyebrow}>{eyebrow}</div>
          {showHelpPopover ? (
            <PopoverIcon
              ariaLabel={helpAriaLabel}
              body={help}
              icon={<FaCircleQuestion aria-hidden className={styles.helpIcon} />}
              interaction="click"
            />
          ) : null}
        </div>
      ) : null}
      <div
        aria-label={eyebrow !== undefined && eyebrow !== '' ? eyebrow : undefined}
        className={optionsWrapperClassName}
        role="radiogroup"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={classNames(styles.option, option.disabled === true ? styles.optionDisabled : null)}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              disabled={option.disabled === true}
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

/** Alias for {@link RadioButton} — a labeled group of radio options. */
export const RadioButtonGroup = RadioButton;
