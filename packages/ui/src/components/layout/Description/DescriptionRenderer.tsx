'use client';

import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import type { DescriptionNode } from '@podverse/helpers';
import { readDescriptionDocument, splitDescriptionClocks } from '@podverse/helpers';

import styles from './SafeHtmlDescription.module.scss';

export type DescriptionRendererProps = {
  description: string;
  /**
   * When set, a clock in this item's prose seeks that item. Channel About omits it.
   * Text already inside a link is left alone.
   */
  onDescriptionClock?: (seconds: number) => void;
  /** Accessible name for a clock control. The visible text stays the clock. */
  descriptionClockLabel?: (clockText: string) => string;
};

const INLINE_KINDS = new Set(['text', 'br', 'a', 'strong', 'em', 'u']);

type ClockRenderOptions = {
  onDescriptionClock?: (seconds: number) => void;
  descriptionClockLabel?: (clockText: string) => string;
  insideLink: boolean;
};

const renderClockText = (
  text: string,
  keyPrefix: string,
  options: ClockRenderOptions
): ReactNode => {
  if (options.insideLink || options.onDescriptionClock === undefined) {
    return text;
  }

  const parts = splitDescriptionClocks(text);
  const hasClock = parts.some((part) => part.kind === 'clock');
  if (!hasClock) {
    return text;
  }

  const onDescriptionClock = options.onDescriptionClock;
  return parts.map((part, index) => {
    if (part.kind === 'text') {
      return <span key={`${keyPrefix}-t-${index}`}>{part.text}</span>;
    }

    const label = options.descriptionClockLabel?.(part.text) ?? part.text;
    return (
      <button
        key={`${keyPrefix}-c-${index}`}
        type="button"
        className={styles.descriptionClock}
        aria-label={label}
        onClick={() => {
          onDescriptionClock(part.seconds);
        }}
      >
        {part.text}
      </button>
    );
  });
};

const renderNodes = (
  nodes: DescriptionNode[],
  keyPrefix: string,
  options: ClockRenderOptions
): ReactNode[] => {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.kind === 'text') {
      return <span key={key}>{renderClockText(node.text, key, options)}</span>;
    }

    if (node.kind === 'br') {
      return <br key={key} />;
    }

    if (node.kind === 'a') {
      return (
        <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
          {renderNodes(node.children, key, { ...options, insideLink: true })}
        </a>
      );
    }

    if (node.kind === 'strong') {
      return <strong key={key}>{renderNodes(node.children, key, options)}</strong>;
    }

    if (node.kind === 'em') {
      return <em key={key}>{renderNodes(node.children, key, options)}</em>;
    }

    if (node.kind === 'u') {
      return <u key={key}>{renderNodes(node.children, key, options)}</u>;
    }

    if (node.kind === 'p') {
      return <p key={key}>{renderNodes(node.children, key, options)}</p>;
    }

    if (node.kind === 'ul') {
      return <ul key={key}>{renderNodes(node.children, key, options)}</ul>;
    }

    if (node.kind === 'ol') {
      return <ol key={key}>{renderNodes(node.children, key, options)}</ol>;
    }

    if (node.kind === 'li') {
      return <li key={key}>{renderNodes(node.children, key, options)}</li>;
    }

    const HeadingTag = node.kind;
    return <HeadingTag key={key}>{renderNodes(node.children, key, options)}</HeadingTag>;
  });
};

/**
 * Channel About and item Summary body.
 * Markdown is rendered when the string matches the stored form. Balanced HTML is rendered
 * when the string is markup instead.
 */
export const DescriptionRenderer: FC<DescriptionRendererProps> = ({
  description,
  onDescriptionClock,
  descriptionClockLabel,
}) => {
  const document = useMemo(() => readDescriptionDocument(description), [description]);
  const clockOptions: ClockRenderOptions = {
    descriptionClockLabel,
    insideLink: false,
    onDescriptionClock,
  };

  if (document.plain.length === 0 && (document.rich === null || document.rich.length === 0)) {
    return null;
  }

  if (document.rich === null) {
    return (
      <p className={styles.safeHtmlDescription}>
        {renderClockText(document.plain, 'plain', clockOptions)}
      </p>
    );
  }

  const rootsAreInline = document.rich.every((node) => INLINE_KINDS.has(node.kind));
  const body = rootsAreInline ? (
    <p>{renderNodes(document.rich, 'd', clockOptions)}</p>
  ) : (
    renderNodes(document.rich, 'd', clockOptions)
  );

  return <div className={styles.safeHtmlDescription}>{body}</div>;
};
