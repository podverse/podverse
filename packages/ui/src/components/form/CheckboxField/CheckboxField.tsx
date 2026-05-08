'use client';

import classNames from 'classnames';
import { useId } from 'react';

import styles from './CheckboxField.module.scss';

export type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Optional explicit id (defaults to a stable `useId()` value). */
  id?: string;
  disabled?: boolean;
  /** Passed through to the checkbox input when present. */
  name?: string;
  /** With `wrapInDiv`, applied to the outer wrapper; otherwise merged onto the `<label>`. */
  className?: string;
  /**
   * When true, wraps the label in a layout `<div>` using the former LabeledCheckbox spacing
   * (flex column, bottom margin).
   */
  wrapInDiv?: boolean;
};

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled = false,
  id: idProp,
  name,
  className,
  wrapInDiv = false,
}: CheckboxFieldProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  const control = (
    <>
      <input
        id={inputId}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={wrapInDiv ? styles.wrapInput : styles.input}
      />
      <span className={wrapInDiv ? styles.wrapLabelText : styles.labelText}>{label}</span>
    </>
  );

  if (wrapInDiv) {
    return (
      <div className={classNames(styles.wrapRoot, className)}>
        <label htmlFor={inputId} className={styles.wrapOption}>
          {control}
        </label>
      </div>
    );
  }

  return (
    <label htmlFor={inputId} className={classNames(styles.label, className)}>
      {control}
    </label>
  );
}
