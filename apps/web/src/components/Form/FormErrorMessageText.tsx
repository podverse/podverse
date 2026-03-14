import classNames from 'classnames';
import React from 'react';

import styles from '../../styles/components/Form/FormErrorMessageText.module.scss';

type Props = {
  message: string;
  className?: string;
};

export const FormErrorMessageText: React.FC<Props> = ({ message, className }) => {
  return <div className={classNames(styles.errorMessage, className)}>{message}</div>;
};
