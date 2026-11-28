'use client';

import classNames from 'classnames';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';

import { useDropdownViewportClamp } from '../../../hooks/useDropdownViewportClamp';
import { IconButton } from '../../button/IconButton/IconButton';

import styles from './AutocompleteDropdown.module.scss';

export const AUTOCOMPLETE_SEARCH_DEBOUNCE_MS = 450;

export type AutocompleteOption = {
  id: string;
  label: string;
  value: string;
};

export type AutocompleteDropdownProps = {
  id: string;
  query: string;
  onQueryChange: (query: string) => void;
  search: (query: string) => Promise<readonly AutocompleteOption[]>;
  onSelect: (option: AutocompleteOption) => void;
  /** Enter while no option is highlighted. The current query, untrimmed. */
  onEnter?: (query: string) => void;
  /** Blur of the text field. The current query, untrimmed. */
  onBlur?: (query: string) => void;
  onSearchError?: (error: unknown) => void;
  listLabel: string;
  clearQueryLabel: string;
  /** Names the input when `eyebrow` is absent. */
  inputLabel?: string;
  eyebrow?: string;
  placeholder?: string;
  info?: string;
  infoError?: string;
  /** Rendered inside the bordered box, before the text field. */
  leading?: ReactNode;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
};

function hasVisibleText(value: string | undefined): boolean {
  return value !== undefined && value !== '';
}

function assertLabels(props: {
  clearQueryLabel: string;
  eyebrow: string | undefined;
  inputLabel: string | undefined;
  listLabel: string;
}): void {
  if (!hasVisibleText(props.eyebrow) && !hasVisibleText(props.inputLabel)) {
    throw new Error('AutocompleteDropdown: pass eyebrow or inputLabel');
  }
  if (props.listLabel === '' || props.clearQueryLabel === '') {
    throw new Error('AutocompleteDropdown: listLabel and clearQueryLabel are required');
  }
}

export function AutocompleteDropdown({
  autoFocus,
  className,
  clearQueryLabel,
  disabled,
  eyebrow,
  id,
  info,
  infoError,
  inputLabel,
  leading,
  listLabel,
  maxLength,
  onBlur,
  onEnter,
  onQueryChange,
  onSearchError,
  onSelect,
  placeholder,
  query,
  search,
}: AutocompleteDropdownProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef(search);
  const onSearchErrorRef = useRef(onSearchError);
  const queryRef = useRef(query);
  const generationRef = useRef(0);
  // Read when the timer fires, so a new function identity does not restart the wait.
  searchRef.current = search;
  onSearchErrorRef.current = onSearchError;
  queryRef.current = query;

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly AutocompleteOption[]>([]);
  const [optionsQuery, setOptionsQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [searchPending, setSearchPending] = useState(false);

  const trimmedQuery = query.trim();
  const hasEyebrow = hasVisibleText(eyebrow);
  const hasLeading = leading !== undefined && leading !== null && leading !== false;
  const listOpen = open && optionsQuery === trimmedQuery && options.length > 0;
  const showClear = query !== '' && disabled !== true;
  const infoId = hasVisibleText(info) ? `${id}-info` : undefined;
  const infoErrorId = hasVisibleText(infoError) ? `${id}-error` : undefined;
  const describedByIds: string[] = [];
  if (infoId !== undefined) {
    describedByIds.push(infoId);
  }
  if (infoErrorId !== undefined) {
    describedByIds.push(infoErrorId);
  }
  const describedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined;

  const { viewportClampStyle } = useDropdownViewportClamp({
    open: listOpen,
    menuRef,
    menuItemCount: options.length,
    position: 'left',
    fullWidth: true,
    verticalPosition: 'below',
  });

  useEffect(() => {
    setOpen(false);
    setHighlightedIndex(null);

    const trimmed = query.trim();
    if (trimmed === '' || disabled === true) {
      generationRef.current += 1;
      setOptions([]);
      setOptionsQuery('');
      setSearchPending(false);
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setSearchPending(true);
    const sent = trimmed;
    const timer = setTimeout(() => {
      void Promise.resolve()
        .then(() => searchRef.current(sent))
        .then(
          (nextOptions) => {
            if (generationRef.current !== generation || queryRef.current.trim() !== sent) {
              return;
            }
            setOptions(nextOptions);
            setOptionsQuery(sent);
            setHighlightedIndex(null);
            setOpen(nextOptions.length > 0);
            setSearchPending(false);
          },
          (error: unknown) => {
            if (generationRef.current !== generation || queryRef.current.trim() !== sent) {
              return;
            }
            setOptions([]);
            setOptionsQuery('');
            setHighlightedIndex(null);
            setOpen(false);
            setSearchPending(false);
            onSearchErrorRef.current?.(error);
          }
        );
    }, AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [disabled, query]);

  useEffect(() => {
    if (!listOpen) {
      return;
    }

    // Focus stays in the text field, so Escape closes the list before a dialog behind it dismisses.
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      setOpen(false);
      setHighlightedIndex(null);
      inputRef.current?.focus();
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [listOpen]);

  useEffect(() => {
    if (!listOpen) {
      return;
    }

    function handlePointerOutside(event: Event) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (fieldRef.current !== null && fieldRef.current.contains(target)) {
        return;
      }
      setOpen(false);
      setHighlightedIndex(null);
    }

    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('pointerdown', handlePointerOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('pointerdown', handlePointerOutside);
    };
  }, [listOpen]);

  assertLabels({ clearQueryLabel, eyebrow, inputLabel, listLabel });

  const activeDescendantId =
    listOpen && highlightedIndex !== null ? `${id}-option-${highlightedIndex}` : undefined;

  return (
    <div className={classNames(styles.root, className)}>
      <div ref={fieldRef} className={styles.anchor}>
        <div
          className={classNames(
            styles.box,
            (hasEyebrow || hasLeading) && styles.boxWrap,
            disabled === true && styles.boxDisabled
          )}
        >
          {hasEyebrow ? (
            <label className={styles.eyebrow} htmlFor={id}>
              {eyebrow}
            </label>
          ) : null}
          {hasLeading ? leading : null}
          <div className={styles.cluster}>
            <input
              ref={inputRef}
              aria-activedescendant={activeDescendantId}
              aria-autocomplete="list"
              aria-busy={searchPending ? true : undefined}
              aria-controls={listOpen ? `${id}-list` : undefined}
              aria-describedby={describedBy}
              aria-expanded={listOpen}
              aria-invalid={infoErrorId !== undefined ? true : undefined}
              aria-label={hasEyebrow ? undefined : inputLabel}
              autoComplete="off"
              autoFocus={autoFocus}
              className={styles.input}
              disabled={disabled}
              id={id}
              maxLength={maxLength}
              placeholder={placeholder}
              role="combobox"
              type="text"
              value={query}
              onBlur={(event) => {
                onBlur?.(event.currentTarget.value);
              }}
              onChange={(event) => {
                onQueryChange(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  const delta = event.key === 'ArrowDown' ? 1 : -1;
                  if (options.length === 0 || optionsQuery !== trimmedQuery) {
                    return;
                  }
                  if (!listOpen && delta === -1) {
                    return;
                  }
                  event.preventDefault();
                  if (!listOpen) {
                    setOpen(true);
                    setHighlightedIndex(0);
                    return;
                  }
                  setHighlightedIndex((current) => {
                    if (current === null) {
                      return delta === 1 ? 0 : options.length - 1;
                    }
                    return (current + delta + options.length) % options.length;
                  });
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (listOpen && highlightedIndex !== null) {
                    const option = options[highlightedIndex];
                    if (option !== undefined) {
                      onSelect(option);
                      setOpen(false);
                      setHighlightedIndex(null);
                    }
                    return;
                  }
                  onEnter?.(query);
                  return;
                }
                if (event.key === 'Tab') {
                  setOpen(false);
                  setHighlightedIndex(null);
                }
              }}
            />
            {showClear ? (
              <span
                className={styles.clearHitTarget}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
              >
                <IconButton
                  appearance="ghost"
                  aria-label={clearQueryLabel}
                  className={styles.clearButton}
                  htmlButtonType="button"
                  onClick={() => {
                    onQueryChange('');
                    inputRef.current?.focus();
                  }}
                >
                  <FaXmark aria-hidden className={styles.clearButtonIcon} />
                </IconButton>
              </span>
            ) : null}
          </div>
        </div>
        {listOpen ? (
          <ul
            ref={menuRef}
            aria-label={listLabel}
            className={styles.list}
            id={`${id}-list`}
            role="listbox"
            style={viewportClampStyle}
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                aria-selected={highlightedIndex === index}
                className={styles.option}
                id={`${id}-option-${index}`}
                role="option"
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                  setHighlightedIndex(null);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {infoId !== undefined ? (
        <div className={styles.info} id={infoId}>
          {info}
        </div>
      ) : null}
      {infoErrorId !== undefined ? (
        <div className={styles.infoError} id={infoErrorId}>
          {infoError}
        </div>
      ) : null}
    </div>
  );
}
