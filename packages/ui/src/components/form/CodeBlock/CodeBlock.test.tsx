import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeBlock } from './CodeBlock';
import styles from './CodeBlock.module.scss';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CodeBlock', () => {
  it('renders the code value and copy control', () => {
    render(
      <CodeBlock
        copiedLabel="Copied"
        copyLabel="Copy"
        testId="sample-code"
        value='<iframe src="https://example.com"></iframe>'
      />
    );

    expect(screen.getByTestId('sample-code-value')).toHaveTextContent(
      '<iframe src="https://example.com"></iframe>'
    );
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
  });

  it('renders aside copy control outside the code panel', () => {
    const { container } = render(
      <CodeBlock
        copiedLabel="Copied"
        copyLabel="Copy"
        copyPlacement="aside"
        testId="sample-code"
        value="hello"
      />
    );

    expect(container.querySelector('[data-testid="sample-code"]')?.className).toContain(
      styles.rootWithAsideCopy
    );
    expect(container.querySelector(`.${styles.headerRow}`)).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('copies the value and shows the copied label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });

    render(
      <CodeBlock
        copiedLabel="Copied"
        copyLabel="Copy"
        onCopy={vi.fn()}
        value="hello"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('hello');
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('disables copy when the value is empty', () => {
    render(<CodeBlock copiedLabel="Copied" copyLabel="Copy" value="" />);

    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });
});
