import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../components/Modal';

describe('Modal component', () => {
  it('renders modal content and triggers close on button click', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Operational Details">
        <p>Modal body content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Operational Details')).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden Dialog">
        <p>Hidden body</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
