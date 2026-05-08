import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Accordion } from './Accordion';

afterEach(() => {
  cleanup();
});

describe('Accordion', () => {
  it('renders header and content', () => {
    render(
      <Accordion header={<span>Title</span>}>
        <p>Body</p>
      </Accordion>
    );

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('renders closed when controlled with open false', () => {
    const { container } = render(
      <Accordion header="H" open={false} onToggle={() => {}}>
        C
      </Accordion>
    );

    const details = container.querySelector('details');
    expect(details?.hasAttribute('open')).toBe(false);
  });
});
