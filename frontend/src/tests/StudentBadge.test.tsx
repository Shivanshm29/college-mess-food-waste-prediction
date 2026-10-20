import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StudentBadge } from '../components/student/StudentBadge';

describe('StudentBadge component', () => {
  it('renders "likely" status with icon and accessible text', () => {
    render(<StudentBadge status="likely" />);
    expect(screen.getByText('Likely to attend')).toBeInTheDocument();
  });

  it('renders "unlikely" status with terracotta styling', () => {
    const { container } = render(<StudentBadge status="unlikely" />);
    expect(screen.getByText('Not likely to attend')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-[#9C4221]');
  });

  it('renders "unsure" status with neutral badge', () => {
    render(<StudentBadge status="unsure" />);
    expect(screen.getByText('Unsure yet')).toBeInTheDocument();
  });

  it('renders "closed" and "pending" statuses', () => {
    const { rerender } = render(<StudentBadge status="closed" />);
    expect(screen.getByText(/response closed/i)).toBeInTheDocument();

    rerender(<StudentBadge status="pending" />);
    expect(screen.getByText(/response pending/i)).toBeInTheDocument();
  });

  it('supports customLabel override', () => {
    render(<StudentBadge status="pending" customLabel="Not answered" />);
    expect(screen.getByText('Not answered')).toBeInTheDocument();
  });

  it('ensures icons have aria-hidden="true" for screen readers', () => {
    const { container } = render(<StudentBadge status="likely" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
