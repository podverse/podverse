import React from 'react';

import styles from './LoadingText.module.scss';

interface LoadingTextProps {
  children: React.ReactNode;
  className?: string;
}

export function LoadingText({ children, className = '' }: LoadingTextProps) {
  const combinedClassName = `${styles.loadingText} ${className}`.trim();
  return <p className={combinedClassName}>{children}</p>;
}
