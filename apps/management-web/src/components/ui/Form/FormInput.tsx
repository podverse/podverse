import React from 'react';
import styles from './FormInput.module.scss';

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function FormInput({ className = '', ...props }: FormInputProps) {
  const combinedClassName = `${styles.formInput} ${className}`.trim();
  return <input className={combinedClassName} {...props} />;
}
