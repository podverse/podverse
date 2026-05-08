import React from 'react';

import styles from '../../styles/components/Window/WindowWrapper.module.scss';

interface WindowWrapperProps {
  children: React.ReactNode;
}

export const WindowWrapper: React.FC<WindowWrapperProps> = ({ children }) => {
  return <div className={styles['window-wrapper']}>{children}</div>;
};
