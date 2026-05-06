import classNames from 'classnames';

import styles from './FormErrorMessageText.module.scss';

export type FormErrorMessageTextProps = {
  message: string;
  className?: string;
};

export function FormErrorMessageText({ message, className }: FormErrorMessageTextProps) {
  return <div className={classNames(styles.errorMessage, className)}>{message}</div>;
}
