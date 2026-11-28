'use client';

import classNames from 'classnames';
import { useRef, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';

import { IconButton } from '../../button/IconButton/IconButton';
import type { AutocompleteOption } from '../AutocompleteDropdown/AutocompleteDropdown';
import { AutocompleteDropdown } from '../AutocompleteDropdown/AutocompleteDropdown';

import styles from './TagField.module.scss';

const EDITABLE_FIELD_ERROR =
  'TagField: editable field requires search, onChange, labels.removeLabel, labels.listLabel, labels.clearQueryLabel, and eyebrow or labels.inputLabel';

export type TagDraftCommitStatus = 'empty' | 'at-max' | 'too-long' | 'duplicate' | 'added';

export type TagDraftCommitResult = {
  status: TagDraftCommitStatus;
  tags: readonly string[];
};

/**
 * Trim `draft` and decide whether it is the next tag.
 * `maxCount` is checked before a duplicate or a long name.
 * Every status other than `added` returns the same `tags` array.
 */
export function commitTagDraft(input: {
  tags: readonly string[];
  draft: string;
  maxCount?: number;
  maxLength?: number;
}): TagDraftCommitResult {
  const trimmed = input.draft.trim();
  if (trimmed.length === 0) {
    return { status: 'empty', tags: input.tags };
  }

  if (typeof input.maxCount === 'number' && input.tags.length >= input.maxCount) {
    return { status: 'at-max', tags: input.tags };
  }

  if (typeof input.maxLength === 'number' && trimmed.length > input.maxLength) {
    return { status: 'too-long', tags: input.tags };
  }

  const comparisonKey = tagKey(trimmed);
  const isDuplicate = input.tags.some((tag) => tagKey(tag) === comparisonKey);
  if (isDuplicate) {
    return { status: 'duplicate', tags: input.tags };
  }

  return { status: 'added', tags: [...input.tags, trimmed] };
}

export type TagFieldLabels = {
  /** Accessible name of the remove control, for example the app's "Remove {tag}". */
  removeLabel: (tag: string) => string;
  /** Accessible name of the suggestion list. */
  listLabel: string;
  /** Accessible name of the control that clears the typed text. */
  clearQueryLabel: string;
  /** Names the text field when `eyebrow` is absent. */
  inputLabel?: string;
};

export type TagFieldProps = {
  id: string;
  value: readonly string[];
  onChange?: (tags: readonly string[]) => void;
  search?: (query: string) => Promise<readonly string[]>;
  readOnly?: boolean;
  disabled?: boolean;
  /** When set, the text field is omitted once `value.length` reaches it. */
  maxCount?: number;
  /**
   * Forwarded to the text field. Typing stops at this length. This component does not pick a
   * number.
   */
  maxLength?: number;
  /**
   * Shown in place of the text field once `maxCount` is reached, when non-empty.
   * The app formats it. This component does not invent a sentence.
   */
  limitMessage?: string;
  /** Controlled text. Omit it and TagField keeps the text itself. */
  draft?: string;
  /** Called with the text field's next value, including `''`. */
  onDraftChange?: (draft: string) => void;
  /** Forwarded to the dropdown. This component does not show the error string. */
  onSearchError?: (error: unknown) => void;
  eyebrow?: string;
  placeholder?: string;
  info?: string;
  infoError?: string;
  labels?: TagFieldLabels;
  autoFocus?: boolean;
  className?: string;
};

function hasVisibleText(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

function tagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

function Eyebrow({ text }: { text: string }) {
  return <div className={styles.eyebrow}>{text}</div>;
}

function TagList({
  disabled = false,
  layout,
  onRemove,
  removeLabel,
  tags,
}: {
  disabled?: boolean;
  layout: 'leading' | 'stack';
  onRemove?: (tag: string) => void;
  removeLabel?: (tag: string) => string;
  tags: readonly string[];
}) {
  return (
    <ul className={layout === 'leading' ? styles.leadingList : styles.stackList}>
      {tags.map((tag) => {
        const removeText = removeLabel === undefined ? undefined : removeLabel(tag);
        return (
          <li key={tagKey(tag)} className={styles.tag}>
            <span className={styles.tagText}>{tag}</span>
            {onRemove === undefined || removeText === undefined ? null : (
              <IconButton
                appearance="ghost"
                aria-label={removeText}
                className={styles.removeButton}
                disabled={disabled}
                htmlButtonType="button"
                onClick={() => {
                  onRemove(tag);
                }}
              >
                <FaXmark aria-hidden className={styles.removeIcon} />
              </IconButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TagField({
  autoFocus,
  className,
  disabled,
  draft,
  eyebrow,
  id,
  info,
  infoError,
  labels,
  limitMessage,
  maxCount,
  maxLength,
  onChange,
  onDraftChange,
  onSearchError,
  placeholder,
  readOnly,
  search,
  value,
}: TagFieldProps) {
  const tagsRef = useRef(value);
  const seenValueRef = useRef(value);
  // Latest list for the next edit: the value prop when its reference changes, otherwise the
  // list last passed to onChange. Two edits can run before the parent renders again.
  if (value !== seenValueRef.current) {
    seenValueRef.current = value;
    tagsRef.current = value;
  }

  const [internalDraft, setInternalDraft] = useState('');
  const draftControlled = draft !== undefined && onDraftChange !== undefined;
  const query = draftControlled ? draft : internalDraft;

  function publishQuery(next: string): void {
    if (!draftControlled) {
      setInternalDraft(next);
    }
    if (onDraftChange !== undefined) {
      onDraftChange(next);
    }
  }

  if (readOnly === true) {
    if (value.length === 0) {
      return null;
    }

    return (
      <div className={classNames(styles.root, className)}>
        {hasVisibleText(eyebrow) ? <Eyebrow text={eyebrow} /> : null}
        <TagList layout="stack" tags={value} />
      </div>
    );
  }

  if (search === undefined || onChange === undefined || labels === undefined) {
    throw new Error(EDITABLE_FIELD_ERROR);
  }
  if (
    typeof labels.removeLabel !== 'function' ||
    labels.listLabel === '' ||
    labels.clearQueryLabel === '' ||
    (!hasVisibleText(eyebrow) && !hasVisibleText(labels.inputLabel))
  ) {
    throw new Error(EDITABLE_FIELD_ERROR);
  }

  const applyCommit = (draftText: string): void => {
    const result = commitTagDraft({
      tags: tagsRef.current,
      draft: draftText,
      maxCount,
      maxLength,
    });
    if (result.status === 'added') {
      tagsRef.current = result.tags;
      onChange(result.tags);
      publishQuery('');
      return;
    }
    if (result.status === 'duplicate' || result.status === 'empty') {
      publishQuery('');
    }
  };

  const removeTag = (tag: string): void => {
    const next = tagsRef.current.filter((item) => item !== tag);
    tagsRef.current = next;
    onChange(next);
  };

  const searchOptions = async (trimmedQuery: string): Promise<readonly AutocompleteOption[]> => {
    const names = await search(trimmedQuery);
    const selected = new Set(tagsRef.current.map((tag) => tagKey(tag)));
    const options: AutocompleteOption[] = [];
    for (const name of names) {
      if (selected.has(tagKey(name))) {
        continue;
      }
      options.push({ id: name, label: name, value: name });
    }
    return options;
  };

  const atMax = typeof maxCount === 'number' && value.length >= maxCount;
  const tagList =
    value.length === 0 ? null : (
      <TagList
        disabled={disabled === true}
        layout={atMax ? 'stack' : 'leading'}
        removeLabel={labels.removeLabel}
        tags={value}
        onRemove={removeTag}
      />
    );

  return (
    <div className={classNames(styles.root, className)}>
      {atMax ? (
        <>
          {hasVisibleText(eyebrow) ? <Eyebrow text={eyebrow} /> : null}
          {tagList}
          {hasVisibleText(limitMessage) ? (
            <p className={styles.limit} id={`${id}-limit`}>
              {limitMessage}
            </p>
          ) : null}
        </>
      ) : (
        <AutocompleteDropdown
          autoFocus={autoFocus}
          clearQueryLabel={labels.clearQueryLabel}
          disabled={disabled}
          eyebrow={eyebrow}
          id={id}
          info={info}
          infoError={infoError}
          inputLabel={labels.inputLabel}
          leading={tagList ?? undefined}
          listLabel={labels.listLabel}
          maxLength={maxLength}
          placeholder={placeholder}
          query={query}
          search={searchOptions}
          onEnter={(entered) => {
            applyCommit(entered);
          }}
          onQueryChange={publishQuery}
          onSearchError={onSearchError}
          onSelect={(option) => {
            applyCommit(option.value);
          }}
        />
      )}
    </div>
  );
}
