import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FeatureComparison } from './FeatureComparison';

afterEach(() => {
  cleanup();
});

describe('FeatureComparison', () => {
  it('renders one header column per tier and one row per feature', () => {
    render(
      <FeatureComparison
        tiers={[
          { id: 'a', name: 'Tier A' },
          { id: 'b', name: 'Tier B' },
        ]}
        features={[
          { name: 'First', available: { a: true, b: false } },
          { name: 'Second', available: { a: false, b: true } },
        ]}
        labels={{ feature: 'Feature', available: 'Available' }}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Feature' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Tier A' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Tier B' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'First' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Second' })).toBeTruthy();
  });

  it('renders checkmarks only where available[tier.id] is true', () => {
    render(
      <FeatureComparison
        tiers={[{ id: 'free', name: 'Free' }]}
        features={[{ name: 'One', available: { free: true } }]}
        labels={{ feature: 'Feature', available: 'Included' }}
      />
    );

    expect(screen.getByLabelText('Included')).toBeTruthy();
  });

  it('does not render checkmarks when available is false', () => {
    render(
      <FeatureComparison
        tiers={[{ id: 'free', name: 'Free' }]}
        features={[{ name: 'One', available: { free: false } }]}
        labels={{ feature: 'Feature', available: 'Included' }}
      />
    );

    expect(screen.queryByLabelText('Included')).toBeNull();
  });
});
