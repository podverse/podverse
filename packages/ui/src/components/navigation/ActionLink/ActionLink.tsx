import classNames from 'classnames';
import type { ComponentType, ReactNode } from 'react';

import styles from './ActionLink.module.scss';

export type ActionLinkLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  'aria-label'?: string;
};

export type ActionLinkVariant = 'primary' | 'inline' | 'subtle';

export type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ActionLinkVariant;
  className?: string;
  LinkComponent?: ComponentType<ActionLinkLinkProps>;
  title?: string;
  ariaLabel?: string;
};

const DefaultLink = ({
  href,
  children,
  className,
  title,
  'aria-label': ariaLabel,
}: ActionLinkLinkProps) => (
  <a href={href} className={className} title={title} aria-label={ariaLabel}>
    {children}
  </a>
);

export function ActionLink({
  href,
  children,
  variant = 'inline',
  className,
  LinkComponent = DefaultLink,
  title,
  ariaLabel,
}: ActionLinkProps) {
  const LinkTag = LinkComponent;

  return (
    <LinkTag
      href={href}
      className={classNames(styles.actionLink, styles[variant], className)}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </LinkTag>
  );
}
