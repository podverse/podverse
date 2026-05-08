import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './InlineForm.module.scss';

type InlineFormProps = {
  children: ReactNode;
  className?: string;
};

type InlineFormInfoProps = {
  children: ReactNode;
  className?: string;
};

type InlineFormButtonsProps = {
  children: ReactNode;
  className?: string;
};

type InlineFormFieldGroupProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Card-like inline form wrapper with secondary background (settings panels and similar).
 */
export function InlineForm({ children, className = '' }: InlineFormProps) {
  return <div className={classNames(styles.inlineForm, className)}>{children}</div>;
}

/** Info/help text within an InlineForm */
export function InlineFormInfo({ children, className = '' }: InlineFormInfoProps) {
  return <div className={classNames(styles.inlineFormInfo, className)}>{children}</div>;
}

/** Button container — right-aligned with gap */
export function InlineFormButtons({ children, className = '' }: InlineFormButtonsProps) {
  return <div className={classNames(styles.inlineFormButtons, className)}>{children}</div>;
}

/** Groups a field with its info text (top margin for spacing) */
export function InlineFormFieldGroup({ children, className = '' }: InlineFormFieldGroupProps) {
  return <div className={classNames(styles.inlineFormFieldGroup, className)}>{children}</div>;
}
