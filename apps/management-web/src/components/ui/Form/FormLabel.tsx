import React from 'react';

import styles from './FormLabel.module.scss';

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function FormLabel({ children, className = '', ...props }: FormLabelProps) {
  const combinedClassName = `${styles.formLabel} ${className}`.trim();
  return (
    <label className={combinedClassName} {...props}>
      {children}
    </label>
  );
}
