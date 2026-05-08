'use client';

import type { FC, MouseEvent } from 'react';

import { IconButton as SharedIconButton } from '@podverse/ui';

import { Link } from '../../Link/Link';

type IconButtonProps = {
  href?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  title?: string;
  color?: 'secondary' | 'primary';
  isGold?: boolean;
  type?: string;
  target?: '_blank';
  rel?: string;
  children?: React.ReactNode;
};

export const IconButton: FC<IconButtonProps> = ({
  href,
  onClick,
  className = '',
  ariaLabel,
  title,
  color = 'secondary',
  isGold = false,
  type,
  target,
  rel,
  children,
}) => {
  const aria = ariaLabel ?? title;
  if (aria === undefined || aria === '') {
    throw new Error('IconButton requires ariaLabel or title for accessibility.');
  }

  const htmlButtonType = type === 'submit' || type === 'reset' ? type : ('button' as const);

  const handleClick = onClick
    ? (_event: MouseEvent<HTMLButtonElement>) => {
        onClick();
      }
    : undefined;

  return (
    <SharedIconButton
      appearance="ghost"
      accent={isGold ? 'gold' : undefined}
      aria-label={aria}
      className={className}
      href={href}
      htmlButtonType={htmlButtonType}
      linkColor={color}
      LinkComponent={Link}
      onClick={handleClick}
      rel={rel}
      target={target}
      title={title}
    >
      {children}
    </SharedIconButton>
  );
};
