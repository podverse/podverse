import type { ComponentType } from 'react';

import styles from './NavCardGrid.module.scss';

export type NavCard = {
  href: string;
  title: string;
  description: string;
};

type NavCardGridLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export type NavCardGridProps = {
  cards: NavCard[];
  LinkComponent?: ComponentType<NavCardGridLinkProps>;
};

const DefaultLink = ({ href, children, className }: NavCardGridLinkProps) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function NavCardGrid({ cards, LinkComponent = DefaultLink }: NavCardGridProps) {
  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <LinkComponent key={card.href} href={card.href} className={styles.card}>
          <h2 className={styles.cardTitle}>{card.title}</h2>
          <p className={styles.cardDescription}>{card.description}</p>
        </LinkComponent>
      ))}
    </div>
  );
}
