import React from 'react';

import styles from '../../styles/components/Form/Form.module.scss';

type FormStackProps = {
  children: React.ReactNode;
  className?: string;
};

export const FormStack: React.FC<FormStackProps> = ({ children, className = '' }) => (
  <div className={[styles.stack, className].filter(Boolean).join(' ')}>{children}</div>
);
