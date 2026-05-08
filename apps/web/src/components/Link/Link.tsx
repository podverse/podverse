'use client';

import NextLink from 'next/link';
import type { ComponentType, FC, MouseEvent, ReactNode } from 'react';

import { getSafeLinkHref } from '@podverse/helpers';
import type { LinkRenderProps } from '@podverse/ui';
import { Link as SharedLink } from '@podverse/ui';

const NextLinkComponent: ComponentType<LinkRenderProps> = ({
  href,
  children,
  className,
  tabIndex,
  'aria-label': ariaLabel,
  title,
  style,
  target,
  rel,
}) => (
  <NextLink
    href={href}
    className={className}
    tabIndex={tabIndex}
    aria-label={ariaLabel}
    title={title}
    style={style}
    target={target}
    rel={rel}
  >
    {children}
  </NextLink>
);

type LinkProps = {
  href?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  tabIndex?: number;
  'aria-label'?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  color?: 'primary' | 'secondary';
  target?: '_blank';
  rel?: string;
  title?: string;
  fullPageLoad?: boolean;
};

export const Link: FC<LinkProps> = ({ href, disabled, ...rest }) => {
  const safeHref = href !== undefined ? getSafeLinkHref(href) : undefined;
  const hrefBlocked = href !== undefined && safeHref === undefined;

  if (hrefBlocked) {
    return <SharedLink {...rest} href={href} disabled LinkComponent={NextLinkComponent} />;
  }

  return (
    <SharedLink {...rest} href={safeHref} disabled={disabled} LinkComponent={NextLinkComponent} />
  );
};
