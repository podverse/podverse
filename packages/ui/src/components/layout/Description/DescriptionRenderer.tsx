'use client';

import type { FC } from 'react';
import { useMemo } from 'react';
import type { IOptions } from 'sanitize-html';
import sanitizeHtml from 'sanitize-html';

import styles from './SafeHtmlDescription.module.scss';

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'a',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'br',
];

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    '*': ['title'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
  },
};

export function isHtmlString(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

export type SafeHtmlDescriptionProps = {
  html: string;
};

export const SafeHtmlDescription: FC<SafeHtmlDescriptionProps> = ({ html }) => {
  const cleanHtml = useMemo(() => {
    return sanitizeHtml(html, SANITIZE_OPTIONS);
  }, [html]);

  return (
    <div className={styles.safeHtmlDescription} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
  );
};

export type DescriptionRendererProps = {
  description: string;
};

export const DescriptionRenderer: FC<DescriptionRendererProps> = ({ description }) => {
  if (isHtmlString(description)) {
    return <SafeHtmlDescription html={description} />;
  }
  return <p className={styles.safeHtmlDescription}>{description}</p>;
};
