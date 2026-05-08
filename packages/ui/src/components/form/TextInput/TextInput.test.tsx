import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextInput } from './TextInput';

import styles from './TextInput.module.scss';

afterEach(() => {
  cleanup();
});

describe('TextInput', () => {
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
});
