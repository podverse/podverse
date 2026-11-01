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
  /** Tighter outer margins and more space between message and action when embedded in a modal. */
  layout?: 'default' | 'modal';
};

/** Message with a single primary button at the start of the column. Modal layout centers it in the dialog. No default strings — apps pass localized content. */
export function CallToActionMessage({
  message,
  buttonLabel,
  onButtonClick,
  className,
  layout = 'default',
}: CallToActionMessageProps) {
  return (
    <div className={classNames(styles.root, layout === 'modal' && styles.rootModal, className)}>
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
