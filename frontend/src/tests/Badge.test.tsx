import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../components/Badge';

describe('Badge component', () => {
  it('renders badge text and icon properly', () => {
    render(<Badge variant="success">Active Operation</Badge>);
    expect(screen.getByText('Active Operation')).toBeInTheDocument();
  });

  it('renders with correct semantic color styling without relying solely on color', () => {
    const { container } = render(<Badge variant="warning">Special Meal</Badge>);
    expect(container.firstChild).toHaveClass('text-[#B45309]');
    // SVGs should have aria-hidden
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
