import React from 'react';
import styles from '../../styles/components/Divider/Divider.module.scss';
import classNames from 'classnames';
import { cssClass } from '../../utils/cssModule';

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
