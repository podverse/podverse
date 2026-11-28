import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AutocompleteDropdownProps, AutocompleteOption } from './AutocompleteDropdown';
import { AUTOCOMPLETE_SEARCH_DEBOUNCE_MS, AutocompleteDropdown } from './AutocompleteDropdown';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Harness({
  initialQuery = '',
  onQueryChange,
  ...props
}: Omit<AutocompleteDropdownProps, 'query' | 'onQueryChange'> & {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  return (
    <AutocompleteDropdown
      {...props}
      query={query}
      onQueryChange={(next) => {
        setQuery(next);
        onQueryChange?.(next);
      }}
    />
  );
}

function deferredOptions(): {
  promise: Promise<readonly AutocompleteOption[]>;
  resolve: (value: readonly AutocompleteOption[]) => void;
  reject: (reason: unknown) => void;
} {
  let resolvePromise: ((value: readonly AutocompleteOption[]) => void) | undefined;
  let rejectPromise: ((reason: unknown) => void) | undefined;
  const promise = new Promise<readonly AutocompleteOption[]>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  if (resolvePromise === undefined || rejectPromise === undefined) {
    throw new Error('Promise executor did not install settle handlers');
  }
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

const fieldLabels = {
  clearQueryLabel: 'Clear Tag Text',
  id: 'tag',
  inputLabel: 'Tag',
  listLabel: 'Tag Suggestions',
};

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('AutocompleteDropdown', () => {
  it('searches the trimmed query once after the debounce', async () => {
    vi.useFakeTimers();
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([])
    );
    render(<Harness {...fieldLabels} search={search} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '  j' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '  ja  ' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();

    await advance(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('ja');
  });

  it('does not search or open a list when the query trims to empty', async () => {
    vi.useFakeTimers();
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([{ id: 'jazz', label: 'Jazz', value: 'jazz' }])
    );
    render(<Harness {...fieldLabels} search={search} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '   ' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps the newer query results when an older response settles later', async () => {
    vi.useFakeTimers();
    const earlier = deferredOptions();
    const later = deferredOptions();
    const search = vi
      .fn<(query: string) => Promise<readonly AutocompleteOption[]>>()
      .mockImplementationOnce(() => earlier.promise)
      .mockImplementationOnce(() => later.promise);
    render(<Harness {...fieldLabels} search={search} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'one' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'two' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);

    await act(async () => {
      later.resolve([{ id: 'later', label: 'Later', value: 'later' }]);
    });
    await act(async () => {
      earlier.resolve([{ id: 'earlier', label: 'Earlier', value: 'earlier' }]);
    });

    expect(screen.getByRole('option', { name: 'Later' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Earlier' })).toBeNull();
  });

  it('reports a rejected search and leaves the list closed', async () => {
    vi.useFakeTimers();
    const failure = new Error('search failed');
    const pending = deferredOptions();
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(
      () => pending.promise
    );
    const onSearchError = vi.fn();
    render(
      <Harness {...fieldLabels} search={search} onSearchError={onSearchError} onSelect={vi.fn()} />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jazz' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
    await act(async () => {
      pending.reject(failure);
    });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onSearchError).toHaveBeenCalledTimes(1);
    expect(onSearchError).toHaveBeenCalledWith(failure);
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('selects a clicked or highlighted option and commits the query otherwise', async () => {
    vi.useFakeTimers();
    const jazz = { id: 'jazz', label: 'Jazz', value: 'jazz' };
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([jazz])
    );
    const onSelect = vi.fn();
    const onEnter = vi.fn();
    render(<Harness {...fieldLabels} search={search} onEnter={onEnter} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Jazz' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);

    const input = screen.getByRole('combobox');
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith('Jazz');
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toBe(jazz);
    expect(screen.queryByRole('listbox')).toBeNull();

    onEnter.mockClear();
    onSelect.mockClear();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith('Jazz');
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('option', { name: 'Jazz' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toBe(jazz);
  });

  it('closes on Escape and reopens stored options with ArrowDown', async () => {
    vi.useFakeTimers();
    const jazz = { id: 'jazz', label: 'Jazz', value: 'jazz' };
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([jazz])
    );
    const onQueryChange = vi.fn();
    render(
      <Harness {...fieldLabels} search={search} onQueryChange={onQueryChange} onSelect={vi.fn()} />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Jazz' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
    expect(screen.getByRole('listbox')).toBeTruthy();

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Tag field is not an input');
    }
    expect(input.value).toBe('Jazz');
    expect(onQueryChange).not.toHaveBeenCalledWith('');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Jazz' })).toBeTruthy();
  });

  it('clears the query from the clear button and keeps focus in the field', async () => {
    vi.useFakeTimers();
    const jazz = { id: 'jazz', label: 'Jazz', value: 'jazz' };
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([jazz])
    );
    const onQueryChange = vi.fn();
    render(
      <Harness {...fieldLabels} search={search} onQueryChange={onQueryChange} onSelect={vi.fn()} />
    );

    expect(screen.queryByRole('button', { name: 'Clear Tag Text' })).toBeNull();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Jazz' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
    expect(screen.getByRole('listbox')).toBeTruthy();

    input.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Tag Text' }));

    expect(onQueryChange).toHaveBeenCalledWith('');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('anchors the open list to the field, not inside the info description', async () => {
    vi.useFakeTimers();
    const jazz = { id: 'jazz', label: 'Jazz', value: 'jazz' };
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([jazz])
    );
    render(
      <Harness {...fieldLabels} info="More detail here." search={search} onSelect={vi.fn()} />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Jazz' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);

    const input = screen.getByRole('combobox');
    const list = screen.getByRole('listbox');
    const infoElement = screen.getByText('More detail here.');
    const fieldWrapper = list.parentElement;

    expect(fieldWrapper).not.toBeNull();
    expect(fieldWrapper?.contains(list)).toBe(true);
    expect(fieldWrapper?.contains(input)).toBe(true);
    expect(infoElement.contains(list)).toBe(false);
    expect(fieldWrapper?.contains(infoElement)).toBe(false);
  });

  it('exposes the open list and the highlighted option to assistive tech', async () => {
    vi.useFakeTimers();
    const jazz = { id: 'jazz', label: 'Jazz', value: 'jazz' };
    const search = vi.fn<(query: string) => Promise<readonly AutocompleteOption[]>>(() =>
      Promise.resolve([jazz])
    );
    render(<Harness {...fieldLabels} search={search} onSelect={vi.fn()} />);

    const input = screen.getByRole('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    fireEvent.change(input, { target: { value: 'Jazz' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe('tag-option-0');
  });

  it('throws when eyebrow and inputLabel are both absent', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(
        <AutocompleteDropdown
          clearQueryLabel="Clear Tag Text"
          id="tag"
          listLabel="Tag Suggestions"
          query=""
          search={vi.fn()}
          onQueryChange={() => {}}
          onSelect={() => {}}
        />
      );
    }).toThrow('AutocompleteDropdown: pass eyebrow or inputLabel');
    consoleError.mockRestore();
  });
});
