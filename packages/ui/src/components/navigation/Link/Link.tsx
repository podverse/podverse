'use client';

import classNames from 'classnames';
import type {
  ComponentType,
  CSSProperties,
  MouseEventHandler,
  ReactElement,
  ReactNode,
} from 'react';

import styles from './Link.module.scss';

export type LinkRenderProps = {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'aria-current'?: 'page';
  tabIndex?: number;
  style?: CSSProperties;
  target?: '_blank';
  rel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export type LinkProps = {
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  tabIndex?: number;
  'aria-label'?: string;
  'aria-current'?: 'page';
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
  'aria-current': ariaCurrent,
  tabIndex,
  style,
  target,
  rel,
  onClick,
}: LinkRenderProps): ReactElement {
  return (
    <a
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      className={className}
      href={href}
      onClick={onClick}
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
  'aria-current': ariaCurrent,
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
          aria-current={ariaCurrent}
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
      'aria-current': ariaCurrent,
      'aria-label': ariaLabel,
      children,
      className: mergedLinkClasses,
      href,
      rel,
      onClick,
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
