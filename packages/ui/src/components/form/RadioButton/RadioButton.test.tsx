import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RadioButton, RadioButtonGroup } from './RadioButton';
import styles from './RadioButton.module.scss';

afterEach(() => {
  cleanup();
});

describe('RadioButton', () => {
  it('calls onChange when an enabled option is selected', () => {
    const onChange = vi.fn();
    render(
      <RadioButton
        name="plan"
        selectedValue="a"
        onChange={onChange}
        options={[
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('renders disabled options that cannot be selected', () => {
    const onChange = vi.fn();
    render(
      <RadioButton
        name="prefer"
        selectedValue="audio"
        onChange={onChange}
        options={[
          { label: 'Audio', value: 'audio' },
          { label: 'Video', value: 'video', disabled: true },
        ]}
      />
    );

    const videoRadio = screen.getByRole('radio', { name: 'Video' });
    expect(videoRadio).toBeDisabled();
    fireEvent.click(videoRadio);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses horizontal wrapping layout by default', () => {
    const { container } = render(
      <RadioButton
        name="layout-default"
        onChange={vi.fn()}
        options={[{ label: 'One', value: 'one' }]}
        selectedValue="one"
      />
    );

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup?.className).toContain(styles.optionsWrapperHorizontal);
  });

  it('supports vertical stacked layout', () => {
    const { container } = render(
      <RadioButton
        layout="vertical"
        name="layout-vertical"
        onChange={vi.fn()}
        options={[
          { label: 'One', value: 'one' },
          { label: 'Two', value: 'two' },
        ]}
        selectedValue="one"
      />
    );

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup?.className).toContain(styles.optionsWrapperVertical);
  });

  it('exposes RadioButtonGroup as an alias', () => {
    expect(RadioButtonGroup).toBe(RadioButton);
  });

  it('renders optional help in a popover beside the eyebrow', async () => {
    render(
      <RadioButton
        eyebrow="Plan"
        help="Choose one option."
        helpAriaLabel="More info"
        name="with-help"
        onChange={vi.fn()}
        options={[{ label: 'One', value: 'one' }]}
        selectedValue="one"
      />
    );

    expect(screen.queryByText('Choose one option.')).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'More info' }).click();
    expect(screen.getByText('Choose one option.')).toBeInTheDocument();
  });
});
