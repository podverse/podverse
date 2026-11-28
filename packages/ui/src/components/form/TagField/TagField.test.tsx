import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTOCOMPLETE_SEARCH_DEBOUNCE_MS } from '../AutocompleteDropdown/AutocompleteDropdown';
import type { TagFieldLabels, TagFieldProps } from './TagField';
import { commitTagDraft, TagField } from './TagField';

const EDITABLE_FIELD_ERROR =
  'TagField: editable field requires search, onChange, labels.removeLabel, labels.listLabel, labels.clearQueryLabel, and eyebrow or labels.inputLabel';

const labels: TagFieldLabels = {
  clearQueryLabel: 'Clear Tag Text',
  inputLabel: 'Tags',
  listLabel: 'Tag Suggestions',
  removeLabel: (tag) => `Remove ${tag}`,
};

const fieldProps = {
  id: 'tags',
  labels,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Harness({
  initialValue = [],
  onChange,
  ...props
}: Omit<TagFieldProps, 'value' | 'onChange'> & {
  initialValue?: readonly string[];
  onChange?: (tags: readonly string[]) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <TagField
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function deferredRejection(): {
  promise: Promise<readonly string[]>;
  reject: (reason: unknown) => void;
} {
  let rejectPromise: ((reason: unknown) => void) | undefined;
  const promise = new Promise<readonly string[]>((_resolve, reject) => {
    rejectPromise = reject;
  });
  if (rejectPromise === undefined) {
    throw new Error('Promise executor did not install settle handlers');
  }
  return { promise, reject: rejectPromise };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function combobox(): HTMLInputElement {
  const input = screen.getByRole('combobox');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Tag field is not an input');
  }
  return input;
}

async function typeAndSearch(text: string): Promise<HTMLInputElement> {
  const input = combobox();
  fireEvent.change(input, { target: { value: text } });
  await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
  return input;
}

function expectEditableError(ui: ReactElement): void {
  expect(() => {
    render(ui);
  }).toThrow(EDITABLE_FIELD_ERROR);
  cleanup();
}

describe('TagField', () => {
  it('searches the trimmed query after the debounce and does not fetch on render', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const search = vi.fn<(query: string) => Promise<readonly string[]>>(() => Promise.resolve([]));
    render(<Harness {...fieldProps} search={search} />);

    expect(search).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(combobox(), { target: { value: '  pod  ' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('pod');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds the typed name on Enter and the suggestion name when that option is chosen', async () => {
    vi.useFakeTimers();
    const search = vi.fn<(query: string) => Promise<readonly string[]>>(() =>
      Promise.resolve(['Podcasting'])
    );
    const onChange = vi.fn<(tags: readonly string[]) => void>();
    render(<Harness {...fieldProps} search={search} onChange={onChange} />);

    await typeAndSearch('pod');
    expect(screen.getByRole('option', { name: 'Podcasting' })).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(1);

    const typedInput = combobox();
    fireEvent.keyDown(typedInput, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['pod']);
    expect(typedInput.value).toBe('');

    cleanup();
    onChange.mockClear();
    render(<Harness {...fieldProps} search={search} onChange={onChange} />);

    const optionInput = await typeAndSearch('pod');
    fireEvent.click(screen.getByRole('option', { name: 'Podcasting' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['Podcasting']);
    expect(optionInput.value).toBe('');
  });

  it('keeps the typed casing on Enter and the suggestion casing when that option is chosen', async () => {
    vi.useFakeTimers();
    const search = vi.fn<(query: string) => Promise<readonly string[]>>(() =>
      Promise.resolve(['Podcasting'])
    );
    const onChange = vi.fn<(tags: readonly string[]) => void>();
    render(<Harness {...fieldProps} search={search} onChange={onChange} />);

    const typedInput = await typeAndSearch('  podcasting  ');
    expect(screen.getByRole('option', { name: 'Podcasting' })).toBeTruthy();
    fireEvent.keyDown(typedInput, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['podcasting']);
    expect(typedInput.value).toBe('');

    cleanup();
    onChange.mockClear();
    render(<Harness {...fieldProps} search={search} onChange={onChange} />);

    const optionInput = await typeAndSearch('podcasting');
    fireEvent.click(screen.getByRole('option', { name: 'Podcasting' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['Podcasting']);
    expect(optionInput.value).toBe('');
  });

  it('hides a suggestion that matches a selected tag and does not add it again', async () => {
    vi.useFakeTimers();
    const search = vi.fn<(query: string) => Promise<readonly string[]>>(() =>
      Promise.resolve(['podcasting'])
    );
    const onChange = vi.fn<(tags: readonly string[]) => void>();
    render(
      <Harness {...fieldProps} initialValue={['Podcasting']} search={search} onChange={onChange} />
    );

    const input = await typeAndSearch('podcasting');
    expect(screen.queryByRole('option')).toBeNull();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('removes a tag by its accessible name and renders read-only tags without a field', () => {
    const onChange = vi.fn<(tags: readonly string[]) => void>();
    const search = vi.fn<(query: string) => Promise<readonly string[]>>(() => Promise.resolve([]));
    const editable = render(
      <TagField {...fieldProps} search={search} value={['Podcasting']} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Podcasting' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);

    editable.unmount();
    const readOnlySearch = vi.fn<(query: string) => Promise<readonly string[]>>(() =>
      Promise.resolve(['Podcasting'])
    );
    render(<TagField id="tags" readOnly search={readOnlySearch} value={['Podcasting']} />);

    expect(screen.getByText('Podcasting')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(readOnlySearch).not.toHaveBeenCalled();
  });

  it('renders nothing when read-only and there are no tags', () => {
    const { container } = render(<TagField eyebrow="Tags" id="tags" readOnly value={[]} />);

    expect(container.textContent).toBe('');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('hides the text field at the count cap and shows it again after a tag is removed', () => {
    render(
      <Harness
        {...fieldProps}
        initialValue={['Podcasting']}
        limitMessage="A playlist has at most 1 tags."
        maxCount={1}
        search={vi.fn(() => Promise.resolve([]))}
      />
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('A playlist has at most 1 tags.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Podcasting' }));

    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.queryByText('A playlist has at most 1 tags.')).toBeNull();
  });

  it('does not add on blur and appends the trimmed draft on Enter', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn<(tags: readonly string[]) => void>();
    render(
      <TagField
        {...fieldProps}
        search={vi.fn(() => Promise.resolve([]))}
        value={['News']}
        onChange={onChange}
      />
    );

    const input = combobox();
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['News', 'hello']);
  });

  it('still adds the trimmed query on Enter after search fails', async () => {
    vi.useFakeTimers();
    const pending = deferredRejection();
    const search = vi.fn<(query: string) => Promise<readonly string[]>>(() => pending.promise);
    const onChange = vi.fn<(tags: readonly string[]) => void>();
    render(<Harness {...fieldProps} search={search} onChange={onChange} />);

    const input = combobox();
    fireEvent.change(input, { target: { value: '  hello  ' } });
    await advance(AUTOCOMPLETE_SEARCH_DEBOUNCE_MS);
    await act(async () => {
      pending.reject(new Error('search failed'));
    });

    expect(screen.queryByRole('option')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['hello']);
  });

  it('commitTagDraft appends a trimmed draft and otherwise returns the same array', () => {
    const tags: readonly string[] = ['Podcasting'];

    const empty = commitTagDraft({ tags, draft: '   ' });
    expect(empty.status).toBe('empty');
    expect(empty.tags).toBe(tags);

    const atMax = commitTagDraft({ tags, draft: 'podcasting', maxCount: 1 });
    expect(atMax.status).toBe('at-max');
    expect(atMax.tags).toBe(tags);

    const tooLong = commitTagDraft({ tags, draft: '  podcasting  ', maxLength: 5 });
    expect(tooLong.status).toBe('too-long');
    expect(tooLong.tags).toBe(tags);

    const duplicate = commitTagDraft({ tags, draft: '  PODCASTING  ' });
    expect(duplicate.status).toBe('duplicate');
    expect(duplicate.tags).toBe(tags);

    const added = commitTagDraft({ tags, draft: '  News  ' });
    expect(added.status).toBe('added');
    expect(added.tags).toEqual(['Podcasting', 'News']);
    expect(added.tags).not.toBe(tags);
  });

  it('throws when an editable field is missing search, onChange, or labels', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expectEditableError(<TagField {...fieldProps} value={[]} onChange={() => {}} />);
      expectEditableError(<TagField {...fieldProps} search={vi.fn(async () => [])} value={[]} />);
      expectEditableError(
        <TagField
          eyebrow="Tags"
          id="tags"
          search={vi.fn(async () => [])}
          value={[]}
          onChange={() => {}}
        />
      );
      expectEditableError(
        <TagField
          id="tags"
          labels={{
            clearQueryLabel: 'Clear Tag Text',
            inputLabel: 'Tags',
            listLabel: '',
            removeLabel: (tag) => `Remove ${tag}`,
          }}
          search={vi.fn(async () => [])}
          value={[]}
          onChange={() => {}}
        />
      );
      expectEditableError(
        <TagField
          id="tags"
          labels={{
            clearQueryLabel: '',
            inputLabel: 'Tags',
            listLabel: 'Tag Suggestions',
            removeLabel: (tag) => `Remove ${tag}`,
          }}
          search={vi.fn(async () => [])}
          value={[]}
          onChange={() => {}}
        />
      );
      expectEditableError(
        <TagField
          id="tags"
          labels={{
            clearQueryLabel: 'Clear Tag Text',
            listLabel: 'Tag Suggestions',
            removeLabel: (tag) => `Remove ${tag}`,
          }}
          search={vi.fn(async () => [])}
          value={[]}
          onChange={() => {}}
        />
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
