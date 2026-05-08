import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditValueModal } from './EditValueModal';

afterEach(() => {
  cleanup();
});

const baseLabels = {
  cancelLabel: 'Cancel',
  closeButtonAriaLabel: 'Close',
  emptyValueMessage: 'Value required',
  saveLabel: 'Save',
  modalAriaLabel: 'Edit dialog',
  title: 'Edit value',
  inputAriaLabel: 'Value',
  inputEyebrow: 'Value',
  inputId: 'edit-value-input',
};

describe('EditValueModal', () => {
  it('resets value when opened with a new initialValue', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <EditValueModal
        {...baseLabels}
        initialValue="10"
        isOpen={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    rerender(
      <EditValueModal
        {...baseLabels}
        initialValue="99"
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: 'Value' });
      expect((input as HTMLInputElement).value).toBe('99');
    });
  });

  it('shows empty error and does not submit when value is blank', async () => {
    const onSubmit = vi.fn();
    render(
      <EditValueModal
        {...baseLabels}
        initialValue="1"
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByRole('textbox', { name: 'Value' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Value required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed value when valid', () => {
    const onSubmit = vi.fn();
    render(
      <EditValueModal
        {...baseLabels}
        initialValue="5"
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByRole('textbox', { name: 'Value' });
    fireEvent.change(input, { target: { value: '  42  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith('42');
  });
});
