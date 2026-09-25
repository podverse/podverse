'use client';

import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import type { DescriptionNode } from '@podverse/helpers';
import { readDescriptionDocument } from '@podverse/helpers';

import styles from './SafeHtmlDescription.module.scss';

export type DescriptionRendererProps = {
  description: string;
};

const INLINE_KINDS = new Set(['text', 'br', 'a', 'strong', 'em', 'u']);

const renderNodes = (nodes: DescriptionNode[], keyPrefix: string): ReactNode[] => {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.kind === 'text') {
      return <span key={key}>{node.text}</span>;
    }

    if (node.kind === 'br') {
      return <br key={key} />;
    }

    if (node.kind === 'a') {
      return (
        <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
          {renderNodes(node.children, key)}
        </a>
      );
    }

    if (node.kind === 'strong') {
      return <strong key={key}>{renderNodes(node.children, key)}</strong>;
    }

    if (node.kind === 'em') {
      return <em key={key}>{renderNodes(node.children, key)}</em>;
    }

    if (node.kind === 'u') {
      return <u key={key}>{renderNodes(node.children, key)}</u>;
    }

    if (node.kind === 'p') {
      return <p key={key}>{renderNodes(node.children, key)}</p>;
    }

    if (node.kind === 'ul') {
      return <ul key={key}>{renderNodes(node.children, key)}</ul>;
    }

    if (node.kind === 'ol') {
      return <ol key={key}>{renderNodes(node.children, key)}</ol>;
    }

    if (node.kind === 'li') {
      return <li key={key}>{renderNodes(node.children, key)}</li>;
    }

    const HeadingTag = node.kind;
    return <HeadingTag key={key}>{renderNodes(node.children, key)}</HeadingTag>;
  });
};

/**
 * Channel About and item Summary body: rich text when the markup is balanced, otherwise plain text.
 */
export const DescriptionRenderer: FC<DescriptionRendererProps> = ({ description }) => {
  const document = useMemo(() => readDescriptionDocument(description), [description]);

  if (document.plain.length === 0 && (document.rich === null || document.rich.length === 0)) {
    return null;
  }

  if (document.rich === null) {
    return <p className={styles.safeHtmlDescription}>{document.plain}</p>;
  }

  const rootsAreInline = document.rich.every((node) => INLINE_KINDS.has(node.kind));
  const body = rootsAreInline ? (
    <p>{renderNodes(document.rich, 'd')}</p>
  ) : (
    renderNodes(document.rich, 'd')
  );

  return <div className={styles.safeHtmlDescription}>{body}</div>;
};
