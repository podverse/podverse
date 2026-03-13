'use client';

import React from 'react';

import styles from '../../styles/components/Boost/DonateSuccessConfetti.module.scss';

const PIECE_COUNT = 24;
const PALETTE = [
  'var(--button-highlight-bg)',
  'var(--button-success-bg)',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
];

export const DonateSuccessConfetti: React.FC = () => (
  <div className={styles.wrapper} aria-hidden="true">
    {Array.from({ length: PIECE_COUNT }, (_, i) => (
      <div
        key={i}
        className={styles.piece}
        style={{
          left: `${(i / PIECE_COUNT) * 100}%`,
          animationDelay: `${i * 0.08}s`,
          backgroundColor: PALETTE[i % PALETTE.length],
        }}
      />
    ))}
  </div>
);
