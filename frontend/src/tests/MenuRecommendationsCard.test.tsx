import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MenuRecommendationsCard } from '../components/MenuRecommendationsCard';
import type { MenuRecommendation } from '../types';

const mockRecommendations: MenuRecommendation[] = [
  {
    menu_items: 'Aloo Palak, Dal Tadka, Veg Biryani, Chapati, Fried Papad, Bundi Raita',
    short_label: 'Aloo Palak, Dal Tadka, Veg Biryani',
    meal_type: 'Lunch',
    projected_students: 470,
    projected_food_required_kg: 142.5,
    projected_food_wastage_kg: 10.4,
    projected_waste_percentage: 7.3,
    student_delta: 9.1,
    student_delta_percentage: 2.0,
    wastage_delta_kg: 0.19,
    waste_percentage_delta: 0.1,
    strategy_badge: 'Highest Attendance',
    reasoning: 'Boosts predicted turnout by +9.1 students with high student satisfaction.',
    score: 15.2,
  },
  {
    menu_items: 'Masala Bhindi/Chawali, Rice, Dal Fry, Chapati, Bundi Raita, Fryums',
    short_label: 'Masala Bhindi/Chawali',
    meal_type: 'Lunch',
    projected_students: 462.8,
    projected_food_required_kg: 140.0,
    projected_food_wastage_kg: 10.15,
    projected_waste_percentage: 7.25,
    student_delta: 1.9,
    student_delta_percentage: 0.4,
    wastage_delta_kg: -0.06,
    waste_percentage_delta: -0.05,
    strategy_badge: 'Lowest Wastage',
    reasoning: 'Reduces food wastage by 0.06 kg while maintaining turnout.',
    score: 12.0,
  },
];

describe('MenuRecommendationsCard component', () => {
  it('renders recommendation items and delta metrics correctly', () => {
    render(
      <MenuRecommendationsCard
        recommendations={mockRecommendations}
        currentStudents={460.9}
        capacity={556}
      />
    );

    expect(screen.getByText('Aloo Palak, Dal Tadka, Veg Biryani')).toBeInTheDocument();
    expect(screen.getByText('Highest Attendance')).toBeInTheDocument();
    expect(screen.getByText('Lowest Wastage')).toBeInTheDocument();
    expect(screen.getByText('+9.1 (+2%)')).toBeInTheDocument();
  });

  it('renders low attendance warning alert when isLowTurnout is true', () => {
    render(
      <MenuRecommendationsCard
        recommendations={mockRecommendations}
        isLowTurnout={true}
        currentStudents={300}
        capacity={556}
      />
    );

    expect(
      screen.getByText('Low Turnout Detected: Menu Optimization Recommendations')
    ).toBeInTheDocument();
    expect(screen.getByText('54% Capacity (300 students)')).toBeInTheDocument();
  });

  it('triggers onApply callback when action button is clicked', () => {
    const handleApply = vi.fn();
    render(
      <MenuRecommendationsCard
        recommendations={mockRecommendations}
        onApply={handleApply}
      />
    );

    const applyButtons = screen.getAllByRole('button', { name: /Apply Menu & Re-Forecast/i });
    expect(applyButtons).toHaveLength(2);

    fireEvent.click(applyButtons[0]);
    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(mockRecommendations[0]);
  });
});
