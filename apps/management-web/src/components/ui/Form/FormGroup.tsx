import React from 'react';
import styles from './FormGroup.module.scss';

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  const combinedClassName = `${styles.formGroup} ${className}`.trim();
  return <div className={combinedClassName}>{children}</div>;
}
