import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CompactTextInput } from './CompactTextInput';

import textInputStyles from '../TextInput/TextInput.module.scss';

afterEach(() => {
  cleanup();
});

describe('CompactTextInput', () => {
  it('renders a compact text input', () => {
    const { container } = render(
      <CompactTextInput
        eyebrow="Default item ID"
        eyebrowPlacement="field"
        name="play_id_text"
        onChange={() => {}}
        value=""
      />
    );

    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(container.querySelector(`.${textInputStyles.textInputCompact}`)).not.toBeNull();
  });
});
