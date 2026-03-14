import React from 'react';

import styles from './CenterContainer.module.scss';

interface CenterContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function CenterContainer({ children, className = '' }: CenterContainerProps) {
  const combinedClassName = `${styles.centerContainer} ${className}`.trim();
  return <div className={combinedClassName}>{children}</div>;
}
