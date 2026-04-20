import React from 'react';

import { TextInput } from './TextInput';

import styles from '../../styles/components/Form/TextInputNumber.module.scss';

type TextInputNumberProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  eyebrow?: string;
  sideText?: string;
  prefix?: string;
  infoError?: string;
};

const TextInputNumber: React.FC<TextInputNumberProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  eyebrow,
  sideText,
  prefix,
  infoError,
  ...rest
}) => {
  // Only allow numbers and empty string
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      onChange(e);
    }
  };

  return (
    <div className={styles.wrapper}>
      <TextInput
        type="number"
        value={value.toString()}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        eyebrow={eyebrow}
        suffix={sideText}
        prefix={prefix}
        infoError={infoError}
        onWheel={(e) => (e.target as HTMLInputElement).blur()} // Prevent scroll changing value
        {...rest}
      />
    </div>
  );
};

export default TextInputNumber;
