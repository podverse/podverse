import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MainPageScaffold } from './MainPageScaffold';

afterEach(() => {
  cleanup();
});

describe('MainPageScaffold', () => {
  it('uses mainOuterWrapper as the default outer element id', () => {
    render(
      <MainPageScaffold footer={<footer>f</footer>}>
        <span>body</span>
      </MainPageScaffold>
    );
    expect(document.getElementById('mainOuterWrapper')).toBeTruthy();
  });

  it('allows overriding outerId', () => {
    render(
      <MainPageScaffold outerId="customOuter" footer={<footer>f</footer>}>
        <span>body</span>
      </MainPageScaffold>
    );
    expect(document.getElementById('customOuter')).toBeTruthy();
    expect(document.getElementById('mainOuterWrapper')).toBeNull();
  });

  it('renders children inside main when children are present', () => {
    render(
      <MainPageScaffold footer={<footer data-testid="ft">foot</footer>}>
        <span>page</span>
      </MainPageScaffold>
    );
    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.getByTestId('ft')).toBeTruthy();
  });

  it('renders emptyStateComponent when there are no children', () => {
    render(
      <MainPageScaffold emptyStateComponent={<span>empty</span>} footer={<footer>f</footer>}>
        {null}
      </MainPageScaffold>
    );
    expect(screen.getByText('empty')).toBeTruthy();
  });

  it('renders neither children nor empty state wrapper when children empty and no emptyStateComponent', () => {
    const { container } = render(
      <MainPageScaffold footer={<footer>f</footer>}>{null}</MainPageScaffold>
    );
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.textContent).toBe('');
  });
});
