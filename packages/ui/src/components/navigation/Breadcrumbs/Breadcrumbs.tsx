import type { ComponentType } from 'react';
import { Fragment } from 'react';

import styles from './Breadcrumbs.module.scss';

export type BreadcrumbsLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export type BreadcrumbItem = {
  href?: string;
  label: React.ReactNode;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  LinkComponent?: ComponentType<BreadcrumbsLinkProps>;
  variant?: 'default' | 'compact';
  className?: string;
  marginBottom?: 'none' | 'lg';
  /** Landmark label for `<nav>` — localize in the app (e.g. `useTranslations('common')`). */
  navAriaLabel: string;
};

const DefaultLink = ({ href, children, className }: BreadcrumbsLinkProps) => (
  <a href={href} className={className}>
    {children}
  </a>
);

function itemIsLink(item: BreadcrumbItem): boolean {
  return typeof item.href === 'string' && item.href.length > 0;
}

export function Breadcrumbs({
  items,
  LinkComponent = DefaultLink,
  variant = 'default',
  className = '',
  marginBottom = 'none',
  navAriaLabel,
}: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  const LinkTag = LinkComponent;
  const navClassName = [marginBottom === 'lg' ? styles.marginBottomLg : '', className]
    .filter(Boolean)
    .join(' ');

  if (variant === 'compact') {
    return (
      <nav aria-label={navAriaLabel} className={navClassName}>
        <p className={styles.compactTrack}>
          {items.map((item, index) => (
            <Fragment key={`crumb-${index}`}>
              {index > 0 ? (
                <>
                  <span aria-hidden> </span>
                  <span aria-hidden>/</span>
                  <span aria-hidden> </span>
                </>
              ) : null}
              {itemIsLink(item) ? (
                <LinkTag href={item.href ?? ''} className={styles.compactLink}>
                  {item.label}
                </LinkTag>
              ) : (
                <span>{item.label}</span>
              )}
            </Fragment>
          ))}
        </p>
      </nav>
    );
  }

  return (
    <nav aria-label={navAriaLabel} className={navClassName}>
      <div className={styles.track}>
        {items.map((item, index) => (
          <Fragment key={`crumb-${index}`}>
            {index > 0 ? (
              <span aria-hidden className={styles.separator}>
                /
              </span>
            ) : null}
            {itemIsLink(item) ? (
              <LinkTag href={item.href ?? ''} className={styles.link}>
                {item.label}
              </LinkTag>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
