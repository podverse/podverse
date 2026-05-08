import styles from './FieldPrimitives.module.scss';

/** Stable class names from shared field chrome for non-React children (e.g. read-only inputs). */
export const fieldPrimitiveClasses = {
  input: styles.input,
  textarea: styles.textarea,
  label: styles.label,
  fieldError: styles.fieldError,
} as const;
