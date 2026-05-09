import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal, ModalActions } from './Modal';

import modalStyles from './Modal.module.scss';

afterEach(() => {
  cleanup();
});

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal ariaLabel="Empty" closeButtonAriaLabel="Close" isOpen={false} onClose={() => {}}>
        <p>Inside</p>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders an accessible dialog with a backdrop when open', () => {
    const onClose = vi.fn();

    render(
      <Modal ariaLabel="Test dialog" closeButtonAriaLabel="Close dialog" isOpen onClose={onClose}>
        <p>Modal body</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog).toBeTruthy();
    expect(dialog.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('Modal body')).toBeTruthy();
  });

  it('sets default --modal-content-max-width on the content panel', () => {
    const { container } = render(
      <Modal ariaLabel="Sized" closeButtonAriaLabel="Close" isOpen onClose={() => {}}>
        <p>x</p>
      </Modal>
    );

    const contentPanel = container.querySelector(
      `.${modalStyles.modalContent}`
    ) as HTMLElement | null;
    expect(contentPanel).not.toBeNull();
    expect(contentPanel?.style.getPropertyValue('--modal-content-max-width')).toBe('580px');
  });

  it('renders ModalActions with the modalActions layout class', () => {
    const { container } = render(
      <Modal ariaLabel="Actions" closeButtonAriaLabel="Close" isOpen onClose={() => {}}>
        <ModalActions>
          <button type="button">A</button>
        </ModalActions>
      </Modal>
    );

    const modalActionsClass = modalStyles.modalActions;
    if (modalActionsClass === undefined) {
      throw new Error('modalActions class missing from CSS module');
    }
    const actions = container.querySelector(`.${modalActionsClass}`);
    if (actions === null) {
      throw new Error('ModalActions root not found');
    }
    expect(actions.classList.contains(modalActionsClass)).toBe(true);
  });

  it('applies scrollbar-gutter stable on modalChildren in supporting environments', () => {
    const { container } = render(
      <Modal ariaLabel="Gutter" closeButtonAriaLabel="Close" isOpen onClose={() => {}}>
        <p>x</p>
      </Modal>
    );

    const childrenHost = container.querySelector(
      `.${modalStyles.modalChildren}`
    ) as HTMLElement | null;
    expect(childrenHost).not.toBeNull();
    const gutter = window.getComputedStyle(childrenHost as HTMLElement).scrollbarGutter;
    if (gutter === '') {
      return;
    }
    expect(gutter).toBe('stable');
  });

  it('applies modalChildrenOverflowHidden when contentOverflowHidden is true', () => {
    const { container } = render(
      <Modal
        ariaLabel="No scroll"
        closeButtonAriaLabel="Close"
        contentOverflowHidden
        isOpen
        onClose={() => {}}
      >
        <p>x</p>
      </Modal>
    );

    const overflowClass = modalStyles.modalChildrenOverflowHidden;
    if (overflowClass === undefined) {
      throw new Error('modalChildrenOverflowHidden class missing from CSS module');
    }
    const childrenHost = container.querySelector(`.${modalStyles.modalChildren}.${overflowClass}`);
    expect(childrenHost).not.toBeNull();
  });

  it('renders children inside modalChildren so defensive shrink rules apply', () => {
    const { container } = render(
      <Modal ariaLabel="Shrink" closeButtonAriaLabel="Close" isOpen onClose={() => {}}>
        <div data-testid="modal-child">x</div>
      </Modal>
    );

    const modalChildrenClass = modalStyles.modalChildren;
    if (modalChildrenClass === undefined) {
      throw new Error('modalChildren class missing from CSS module');
    }
    const childrenHost = container.querySelector(`.${modalChildrenClass}`);
    expect(childrenHost).not.toBeNull();

    const child = container.querySelector('[data-testid="modal-child"]');
    expect(child).not.toBeNull();
    expect(childrenHost?.contains(child)).toBe(true);
  });
});
