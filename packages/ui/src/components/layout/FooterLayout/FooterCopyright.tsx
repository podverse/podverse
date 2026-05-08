import classNames from 'classnames';
import type { ComponentType } from 'react';
import { FaRegCopyright } from 'react-icons/fa6';

import type { FooterBrandLinkProps } from './FooterBrand';

import styles from './FooterCopyright.module.scss';

export type FooterCopyrightProps = {
  href: string;
  label: string;
  className?: string;
  LinkComponent?: ComponentType<FooterBrandLinkProps>;
};

const DefaultLink = ({ href, children, className }: FooterBrandLinkProps) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function FooterCopyright({
  href,
  label,
  className,
  LinkComponent = DefaultLink,
}: FooterCopyrightProps) {
  const LinkTag = LinkComponent;

  return (
    <LinkTag href={href} className={classNames(styles.link, className)}>
      {label}
      <span className={styles.copyright}>
        <FaRegCopyright />
      </span>
    </LinkTag>
  );
}
