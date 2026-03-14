import classNames from 'classnames';
import React from 'react';

import { cssClass } from '../../utils/cssModule';

import styles from '../../styles/components/Divider/Divider.module.scss';

type DividerProps = {
  className?: string;
  withSpacing?: boolean;
};

export const Divider: React.FC<DividerProps> = ({ className, withSpacing }) => (
  <hr
    className={classNames(
      styles.divider,
      { [cssClass(styles, 'dividerWithSpacing')]: withSpacing },
      className
    )}
  />
);
