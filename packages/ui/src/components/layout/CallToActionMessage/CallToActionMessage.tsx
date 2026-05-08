import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './CallToActionMessage.module.scss';

export type CallToActionMessageProps = {
  /** Primary copy — localize in the app before passing. */
  message: ReactNode;
  /** Visible button label — localize in the app. */
  buttonLabel: ReactNode;
  onButtonClick: () => void;
  className?: string;
};

/** Centered message with a single primary button; no default strings — apps pass localized content. */
export function CallToActionMessage({
  message,
  buttonLabel,
  onButtonClick,
  className,
}: CallToActionMessageProps) {
  return (
    <div className={classNames(styles.root, className)}>
      <div className={styles.message}>
        <p>{message}</p>
      </div>
      <div className={styles.action}>
        <button type="button" onClick={onButtonClick}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
