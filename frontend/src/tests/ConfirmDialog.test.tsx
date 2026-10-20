import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '../components/ConfirmDialog';

describe('ConfirmDialog component', () => {
  it('renders confirmation dialog with accessible roles and calls onConfirm', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Prediction"
        message="Are you sure you want to delete this forecast record?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Prediction')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this forecast record?')).toBeInTheDocument();

    const confirmBtn = screen.getByText('Delete');
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Hidden Dialog"
        message="Hidden"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
