import React from 'react';

import styles from '../../styles/components/Form/Form.module.scss';

type FormProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

const Form: React.FC<FormProps> = ({ onSubmit, children, className = '', style }) => (
  <form
    onSubmit={onSubmit}
    className={[styles.stack, className].filter(Boolean).join(' ')}
    style={style}
  >
    {children}
  </form>
);

export default Form;
