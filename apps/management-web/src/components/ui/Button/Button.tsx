import React from 'react';

import styles from './Button.module.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'default';
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const variantClass = variant === 'primary' ? styles.buttonPrimary : styles.button;
  const combinedClassName = `${variantClass} ${className}`.trim();

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}
