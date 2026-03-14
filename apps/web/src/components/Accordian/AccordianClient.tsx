'use client';

import classNames from 'classnames';
import React from 'react';
import { FaChevronRight } from 'react-icons/fa6';

import styles from '../../styles/components/Accordian/Accordian.module.scss';

type AccordionClientProps = {
  header: React.ReactNode;
  headerClass?: string;
  content: React.ReactNode;
  contentClass?: string;
  color?: 'primary' | 'secondary' | 'link';
  size?: 'small' | 'large';
  open?: boolean;
  onToggle?: (open: boolean) => void;
};

const AccordionClient: React.FC<AccordionClientProps> = ({
  header,
  headerClass,
  content,
  contentClass,
  color = 'primary',
  size = 'large',
  open = false,
  onToggle,
}) => (
  <details
    className={classNames(styles.accordion, styles[color], styles[size])}
    open={open}
    onToggle={(event) => onToggle?.((event.currentTarget as HTMLDetailsElement).open)}
  >
    <summary className={classNames(styles.accordionHeader, headerClass)}>
      <span className={classNames(styles.headerIcon, styles[color])}>
        <FaChevronRight />
      </span>
      {header}
    </summary>
    <div className={classNames(styles.accordionContent, contentClass)}>{content}</div>
  </details>
);

export default AccordionClient;
