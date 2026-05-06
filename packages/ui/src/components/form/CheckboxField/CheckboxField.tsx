'use client';

import { useId } from 'react';

import styles from './CheckboxField.module.scss';

export type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function CheckboxField({ label, checked, onChange, disabled = false }: CheckboxFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={styles.label}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.input}
      />
      <span className={styles.labelText}>{label}</span>
    </label>
  );
}
