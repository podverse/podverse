import classNames from 'classnames';
import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import styles from './FieldPrimitives.module.scss';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, ...props },
  ref
) {
  return <textarea ref={ref} className={classNames(styles.textarea, className)} {...props} />;
});
