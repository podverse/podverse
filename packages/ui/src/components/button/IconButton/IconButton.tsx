import classNames from 'classnames';
import type { ComponentType, MouseEvent, ReactNode, Ref } from 'react';
import { forwardRef } from 'react';
import { FaSpinner } from 'react-icons/fa';

import styles from './IconButton.module.scss';

export type IconButtonVariant = 'default' | 'danger';
export type IconButtonAppearance = 'control' | 'ghost';

export type IconButtonLinkComponentProps = {
  href?: string;
  className?: string;
  'aria-label': string;
  children: ReactNode;
  title?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  color?: 'primary' | 'secondary';
  target?: '_blank';
  rel?: string;
  disabled?: boolean;
  tabIndex?: number;
};

export type IconButtonProps = {
  'aria-label': string;
  accent?: 'gold';
  appearance?: IconButtonAppearance;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  htmlButtonType?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  linkColor?: 'primary' | 'secondary';
  LinkComponent?: ComponentType<IconButtonLinkComponentProps>;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  rel?: string;
  target?: '_blank';
  title?: string;
  variant?: IconButtonVariant;
};

function DefaultLink(props: IconButtonLinkComponentProps) {
  const { href, className, 'aria-label': ariaLabel, children, title, target, rel } = props;
  if (href === undefined || href === '') {
    throw new Error('IconButton anchor mode requires a non-empty href');
  }

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      title={title}
      target={target}
      rel={rel}
    >
      {children}
    </a>
  );
}

function rootClassNames({
  accent,
  appearance,
  className,
  variant,
}: Pick<IconButtonProps, 'accent' | 'appearance' | 'className' | 'variant'>): string {
  const appearanceClass =
    appearance === 'ghost' ? styles.appearanceGhost : styles.appearanceControl;
  const variantClass =
    variant === 'danger'
      ? appearance === 'ghost'
        ? styles.variantDangerGhost
        : styles.variantDanger
      : null;
  const accentClass = accent === 'gold' && appearance === 'ghost' ? styles.accentGold : null;

  return classNames(styles.base, appearanceClass, variantClass, accentClass, className);
}

export const IconButton = forwardRef(function IconButton(
  {
    'aria-label': ariaLabel,
    accent,
    appearance = 'control',
    children,
    className,
    disabled = false,
    href,
    htmlButtonType = 'button',
    isLoading = false,
    linkColor,
    LinkComponent = DefaultLink,
    onClick,
    rel,
    target,
    title,
    variant = 'default',
  }: IconButtonProps,
  ref: Ref<HTMLButtonElement>
) {
  const rootClass = rootClassNames({ accent, appearance, className, variant });

  const hasHref = href !== undefined && href !== '';
  const shouldUseAppLink = LinkComponent !== DefaultLink && (hasHref || onClick !== undefined);

  if (shouldUseAppLink) {
    const LinkTag = LinkComponent;
    return (
      <LinkTag
        href={hasHref ? href : undefined}
        className={rootClass}
        aria-label={ariaLabel}
        title={title}
        color={linkColor}
        target={target}
        rel={rel}
        disabled={disabled || isLoading}
        onClick={isLoading ? undefined : onClick}
        type={hasHref ? undefined : htmlButtonType}
      >
        {children}
      </LinkTag>
    );
  }

  if (hasHref) {
    return (
      <DefaultLink
        href={href}
        className={rootClass}
        aria-label={ariaLabel}
        title={title}
        target={target}
        rel={rel}
      >
        {children}
      </DefaultLink>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className={rootClass}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      <span className={classNames(styles.iconWrap, isLoading ? styles.iconWrapInvisible : null)}>
        {children}
      </span>
      {isLoading ? (
        <span className={styles.spinnerWrapper} aria-hidden>
          <FaSpinner className={styles.spinner} />
        </span>
      ) : null}
    </button>
  );
});

IconButton.displayName = 'IconButton';
