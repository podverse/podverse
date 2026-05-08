'use client';

import type { ChangeEvent, CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { TextInput } from '../TextInput/TextInput';

export type SearchInputProps = {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
};

export function SearchInput({
  onChange,
  onSearch,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  style,
  id,
  name,
  autoFocus,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState<string | null>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (inputValue === null) {
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      onSearch(inputValue);
    }, 1000);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [inputValue, onSearch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange?.(e);
  };

  const handleButtonClick = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (inputValue === null) {
      return;
    }
    onSearch(inputValue);
  }, [inputValue, onSearch]);

  return (
    <TextInput
      value={inputValue ?? ''}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      style={style}
      id={id}
      name={name}
      autoFocus={autoFocus}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      buttonIcon={{
        position: 'start',
        icon: <FaMagnifyingGlass />,
        onClick: handleButtonClick,
      }}
      type="text"
    />
  );
}
