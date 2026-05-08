import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StackForm } from './StackForm';

import formStackStyles from '../FormStack/FormStack.module.scss';

afterEach(() => {
  cleanup();
});

describe('StackForm', () => {
  it('uses the same vertical stack class as FormStack', () => {
    const { container } = render(
      <StackForm onSubmit={(e) => e.preventDefault()}>
        <span>a</span>
      </StackForm>
    );

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    expect(form?.className.split(/\s+/)).toContain(formStackStyles.stack);
  });
});
