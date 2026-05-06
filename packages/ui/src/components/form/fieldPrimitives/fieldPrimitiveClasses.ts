import styles from './FieldPrimitives.module.scss';

/** Stable class names from shared field chrome for non-React children (e.g. theme `<select>`). */
export const fieldPrimitiveClasses = {
  input: styles.input,
  select: styles.select,
  textarea: styles.textarea,
  label: styles.label,
  fieldError: styles.fieldError,
} as const;
