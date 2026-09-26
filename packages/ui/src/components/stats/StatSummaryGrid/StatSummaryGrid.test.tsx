import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatSummaryGrid } from './StatSummaryGrid';

describe('StatSummaryGrid', () => {
  it('renders label and value pairs', () => {
    render(
      <StatSummaryGrid
        items={[
          { label: 'Today', value: '42' },
          { label: 'All-Time', value: '9001' },
        ]}
      />
    );

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('All-Time')).toBeTruthy();
    expect(screen.getByText('9001')).toBeTruthy();
  });
});
