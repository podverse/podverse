import classNames from 'classnames';

import styles from './FormInfoMessageText.module.scss';

export type FormInfoMessageTextProps = {
  message: string;
  className?: string;
};

export function FormInfoMessageText({ message, className }: FormInfoMessageTextProps) {
  return <div className={classNames(styles.infoMessage, className)}>{message}</div>;
}
