'use client';

import classNames from 'classnames';
import type { ComponentType, ReactNode } from 'react';

import { Image } from '../../image/Image/Image';

import styles from './FooterBrand.module.scss';

export type FooterBrandLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export type FooterBrandProps = {
  logoSrc: string;
  alt: string;
  href?: string;
  width?: number;
  /** Omit fixed img height when `null` (non-144×25 wordmarks). Defaults to 25 when unset. */
  height?: number | null;
  skipProxy?: boolean;
  className?: string;
  LinkComponent?: ComponentType<FooterBrandLinkProps>;
};

const DefaultLink = ({ href, children, className }: FooterBrandLinkProps) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function FooterBrand({
  logoSrc,
  alt,
  href = '/',
  width = 144,
  height,
  skipProxy,
  className,
  LinkComponent = DefaultLink,
}: FooterBrandProps) {
  const LinkTag = LinkComponent;
  const imageHeightProps = height === null ? {} : { height: height ?? 25 };

  return (
    <LinkTag href={href} className={classNames(styles.brand, className)}>
      <Image alt={alt} skipProxy={skipProxy} src={logoSrc} width={width} {...imageHeightProps} />
    </LinkTag>
  );
}
