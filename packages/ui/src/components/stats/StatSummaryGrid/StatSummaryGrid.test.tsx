import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatSummaryGrid } from './StatSummaryGrid';

describe('StatSummaryGrid', () => {
  it('renders label and value pairs', () => {
    render(
      <StatSummaryGrid
        items={[
          { label: 'Today', value: '42' },
          { label: 'All-time', value: '9001' },
        ]}
      />
    );

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('All-time')).toBeTruthy();
    expect(screen.getByText('9001')).toBeTruthy();
  });
});
