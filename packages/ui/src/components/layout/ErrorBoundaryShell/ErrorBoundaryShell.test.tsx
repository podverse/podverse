import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundaryShell, GlobalErrorBoundaryShell } from './ErrorBoundaryShell';

afterEach(() => {
  cleanup();
});

const baseStrings = {
  title: 'Boundary title',
  message: 'Boundary message',
  tryAgainLabel: 'Try again',
  reloadLabel: 'Reload',
  goHomeLabel: 'Home',
  detailsSummaryLabel: 'Details',
};

describe('ErrorBoundaryShell', () => {
  it('renders title and message', () => {
    render(
      <ErrorBoundaryShell
        {...baseStrings}
        error={new Error('x')}
        onReset={() => {}}
        showDetails={false}
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Boundary title' })).toBeTruthy();
    expect(screen.getByText('Boundary message')).toBeTruthy();
  });

  it('shows details block when showDetails is true', () => {
    render(
      <ErrorBoundaryShell
        {...baseStrings}
        error={new Error('boom')}
        onReset={() => {}}
        showDetails
      />
    );
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText(/boom/)).toBeTruthy();
  });

  it('hides details block when showDetails is false', () => {
    render(
      <ErrorBoundaryShell
        {...baseStrings}
        error={new Error('boom')}
        onReset={() => {}}
        showDetails={false}
      />
    );
    expect(screen.queryByText('Details')).toBeNull();
  });

  it('calls onReset when Try again is clicked', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundaryShell
        {...baseStrings}
        error={new Error('x')}
        onReset={onReset}
        showDetails={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls custom onReload when provided', () => {
    const onReload = vi.fn();
    render(
      <ErrorBoundaryShell
        {...baseStrings}
        error={new Error('x')}
        onReset={() => {}}
        onReload={onReload}
        showDetails={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('omits home button when goHomeLabel is omitted', () => {
    render(
      <ErrorBoundaryShell
        title={baseStrings.title}
        message={baseStrings.message}
        tryAgainLabel={baseStrings.tryAgainLabel}
        reloadLabel={baseStrings.reloadLabel}
        detailsSummaryLabel={baseStrings.detailsSummaryLabel}
        error={new Error('x')}
        onReset={() => {}}
        showDetails={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Home' })).toBeNull();
  });
});

describe('GlobalErrorBoundaryShell', () => {
  it('renders two actions only (no home button)', () => {
    render(
      <GlobalErrorBoundaryShell
        title="Global"
        message="Msg"
        tryAgainLabel="Try"
        reloadLabel="Reload"
        detailsSummaryLabel="Dev"
        error={new Error('e')}
        onReset={() => {}}
        showDetails={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Try' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Home' })).toBeNull();
  });
});
