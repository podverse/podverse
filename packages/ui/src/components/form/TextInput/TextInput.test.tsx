import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextInput } from './TextInput';

import styles from './TextInput.module.scss';

afterEach(() => {
  cleanup();
});

describe('TextInput', () => {
  it('renders the native picker trailing affix when eyebrow and aria label are set on a datetime-local field', () => {
    render(
      <TextInput
        eyebrow="Membership Expires At"
        nativePickerAffixAriaLabel="Open date and time picker"
        type="datetime-local"
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Open date and time picker' })).toBeTruthy();
  });

  it('does not render the trailing picker affix when eyebrow is set but no picker aria label is available', () => {
    render(
      <TextInput
        eyebrow="Membership Expires At"
        type="datetime-local"
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls showPicker when the trailing affix is clicked', () => {
    const previous = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'showPicker');
    const showPickerStub = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      writable: true,
      value: showPickerStub,
    });

    try {
      render(
        <TextInput
          eyebrow="Expires"
          nativePickerAffixAriaLabel="Open picker"
          type="datetime-local"
          value=""
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
      expect(showPickerStub).toHaveBeenCalledTimes(1);
    } finally {
      if (previous !== undefined) {
        Object.defineProperty(HTMLInputElement.prototype, 'showPicker', previous);
      } else {
        Reflect.deleteProperty(HTMLInputElement.prototype, 'showPicker');
      }
    }
  });

  it('renders the root with the textInput layout class inside a constrained width parent', () => {
    const { container } = render(
      <div style={{ width: '200px' }}>
        <TextInput value="" onChange={vi.fn()} />
      </div>
    );

    const rootClass = styles.textInput;
    if (rootClass === undefined) {
      throw new Error('textInput class missing from CSS module');
    }
    const root = container.querySelector(`.${rootClass}`) as HTMLElement | null;
    expect(root).not.toBeNull();

    const wrapperClass = styles.textInputWrapper;
    if (wrapperClass === undefined) {
      throw new Error('textInputWrapper class missing from CSS module');
    }
    const wrapper = container.querySelector(`.${wrapperClass}`);
    expect(wrapper).not.toBeNull();
    expect(root?.contains(wrapper)).toBe(true);
  });

  it('renders the eyebrow above the bordered control when eyebrowPlacement is field', () => {
    const { container } = render(
      <TextInput
        eyebrow="Start time (seconds)"
        eyebrowPlacement="field"
        name="start_time"
        value="0"
        onChange={vi.fn()}
      />
    );

    const rootClass = styles.textInput;
    const wrapperClass = styles.textInputWrapper;
    if (rootClass === undefined || wrapperClass === undefined) {
      throw new Error('textInput CSS module classes missing');
    }

    const root = container.querySelector(`.${rootClass}`) as HTMLElement | null;
    const wrapper = container.querySelector(`.${wrapperClass}`) as HTMLElement | null;
    const label = screen.getByText('Start time (seconds)');

    expect(root).not.toBeNull();
    expect(wrapper).not.toBeNull();
    expect(root?.contains(label)).toBe(true);
    expect(wrapper?.contains(label)).toBe(false);
  });
});
