import React from 'react';
import styles from './Card.module.scss';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered';
  className?: string;
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const variantClass = variant === 'bordered' ? styles.cardBordered : styles.card;
  const combinedClassName = `${variantClass} ${className}`.trim();

  return <div className={combinedClassName}>{children}</div>;
}
