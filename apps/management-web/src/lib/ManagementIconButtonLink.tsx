import NextLink from 'next/link';

import type { IconButtonLinkComponentProps } from '@podverse/ui';

/**
 * Bridges `@podverse/ui` IconButton `LinkComponent` to `next/link` without widening package types to Next's LinkProps.
 */
export function ManagementIconButtonLink(props: IconButtonLinkComponentProps) {
  const { href, children, className, title, target, rel, 'aria-label': ariaLabel } = props;

  if (href === undefined || href === '') {
    throw new Error('ManagementIconButtonLink requires a non-empty href');
  }

  return (
    <NextLink
      href={href}
      className={className}
      aria-label={ariaLabel}
      title={title}
      target={target}
      rel={rel}
    >
      {children}
    </NextLink>
  );
}
