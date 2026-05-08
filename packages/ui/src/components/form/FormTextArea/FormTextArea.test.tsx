import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { FormTextArea } from './FormTextArea';

afterEach(() => {
  cleanup();
});

function StatefulHarness() {
  const [value, setValue] = useState('');
  return (
    <>
      <FormTextArea
        aria-label="Note"
        maxLength={4}
        name="note"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span data-testid="committed-value">{value}</span>
    </>
  );
}

describe('FormTextArea', () => {
  it('truncates pasted/overlong input to maxLength via onChange', () => {
    render(<StatefulHarness />);

    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'toolong' } });
    expect(screen.getByTestId('committed-value').textContent).toBe('tool');
  });
});
