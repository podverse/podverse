import React from 'react';
import styles from './Alert.module.scss';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'error' | 'default';
  className?: string;
}

export function Alert({ children, variant = 'error', className = '' }: AlertProps) {
  const variantClass = variant === 'error' ? styles.alertError : styles.alert;
  const combinedClassName = `${variantClass} ${className}`.trim();

  return <div className={combinedClassName}>{children}</div>;
}
