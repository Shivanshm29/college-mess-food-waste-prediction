import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LiveAnnouncer } from '../components/LiveAnnouncer';

describe('LiveAnnouncer component', () => {
  it('renders screen-reader live region with polite politeness and status role', () => {
    render(<LiveAnnouncer message="Prediction calculated successfully" />);

    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveTextContent('Prediction calculated successfully');
  });

  it('renders empty when message is empty string', () => {
    render(<LiveAnnouncer message="" />);

    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent('');
  });
});
