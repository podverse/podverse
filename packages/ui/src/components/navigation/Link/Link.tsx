'use client';

import classNames from 'classnames';
import type { ComponentType, CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';

import styles from './Link.module.scss';

export type LinkRenderProps = {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  'aria-label'?: string;
  tabIndex?: number;
  style?: CSSProperties;
  target?: '_blank';
  rel?: string;
};

export type LinkProps = {
  href?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  tabIndex?: number;
  'aria-label'?: string;
  disabled?: boolean;
  style?: CSSProperties;
  color?: 'primary' | 'secondary';
  target?: '_blank';
  rel?: string;
  title?: string;
  fullPageLoad?: boolean;
  LinkComponent?: ComponentType<LinkRenderProps>;
  AnchorComponent?: ComponentType<LinkRenderProps>;
};

function DefaultPlainAnchor({
  href,
  children,
  className,
  title,
  'aria-label': ariaLabel,
  tabIndex,
  style,
  target,
  rel,
}: LinkRenderProps): ReactElement {
  return (
    <a
      aria-label={ariaLabel}
      className={className}
      href={href}
      rel={rel}
      style={style}
      tabIndex={tabIndex}
      target={target}
      title={title}
    >
      {children}
    </a>
  );
}

export function Link({
  href,
  onClick,
  children,
  className,
  type = 'button',
  tabIndex,
  'aria-label': ariaLabel,
  disabled = false,
  style,
  color = 'primary',
  target,
  rel,
  title,
  fullPageLoad = false,
  LinkComponent = DefaultPlainAnchor,
  AnchorComponent = DefaultPlainAnchor,
}: LinkProps): ReactElement {
  const linkClassName = color === 'primary' ? styles.link : styles.linkSecondary;
  const mergedLinkClasses = classNames(linkClassName, className);

  if (href !== undefined) {
    if (disabled) {
      return (
        <span
          aria-disabled="true"
          className={classNames(linkClassName, className, styles.disabled)}
          style={style}
          title={title}
        >
          {children}
        </span>
      );
    }

    const anchorProps: LinkRenderProps = {
      'aria-label': ariaLabel,
      children,
      className: mergedLinkClasses,
      href,
      rel,
      style,
      tabIndex,
      target,
      title,
    };

    if (fullPageLoad) {
      const AnchorTag = AnchorComponent;
      return <AnchorTag {...anchorProps} />;
    }

    const ClientLinkTag = LinkComponent;
    return <ClientLinkTag {...anchorProps} />;
  }

  return (
    <button
      aria-label={ariaLabel}
      className={mergedLinkClasses}
      disabled={disabled}
      onClick={onClick}
      style={style}
      tabIndex={tabIndex}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
}
