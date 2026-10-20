import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from '../components/StatCard';

describe('StatCard component', () => {
  it('renders label, value, and unit correctly', () => {
    render(
      <StatCard
        label="Food Required"
        value={135.5}
        unit="kg"
        subtext="Estimated for lunch"
      />
    );

    expect(screen.getByText('Food Required')).toBeInTheDocument();
    expect(screen.getByText('135.5')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('Estimated for lunch')).toBeInTheDocument();
  });

  it('renders with custom variant border styling', () => {
    const { container } = render(
      <StatCard label="Waste Rate" value="4.8%" variant="warning" />
    );
    expect(container.firstChild).toHaveClass('border-l-[#B45309]');
  });
});
