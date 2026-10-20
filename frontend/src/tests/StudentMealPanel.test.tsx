import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentMealPanel } from '../components/student/StudentMealPanel';
import { StudentMealItem } from '../types/student';

const mockMealOpen: StudentMealItem = {
  meal_type: 'Lunch',
  time_window: '12:30 PM - 2:30 PM',
  cutoff_time: '11:00 AM',
  cutoff_iso: '2026-10-19T11:00:00',
  is_closed: false,
  closure_reason: null,
  menu_items: 'Paneer Butter Masala, Dal Tadka, Jeera Rice, Phulka',
  category: 'North Indian',
  current_intention: null,
};

const mockMealClosed: StudentMealItem = {
  meal_type: 'Breakfast',
  time_window: '7:30 AM - 9:30 AM',
  cutoff_time: '6:30 AM',
  cutoff_iso: '2026-10-19T06:30:00',
  is_closed: true,
  closure_reason: 'Cutoff time (6:30 AM) has passed for today.',
  menu_items: 'Idli, Sambar, Coconut Chutney',
  category: 'South Indian',
  current_intention: null,
};

describe('StudentMealPanel component', () => {
  it('renders meal information, service window, cutoff and menu items', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <StudentMealPanel
        meal={mockMealOpen}
        dateStr="2026-10-19"
        onSaveIntention={onSave}
      />
    );

    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('12:30 PM - 2:30 PM')).toBeInTheDocument();
    expect(screen.getByText(/Paneer Butter Masala/)).toBeInTheDocument();
  });

  it('allows student to select an intention and submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <StudentMealPanel
        meal={mockMealOpen}
        dateStr="2026-10-19"
        onSaveIntention={onSave}
      />
    );

    // Query radio button by value
    const likelyRadio = screen.getByDisplayValue('likely');
    fireEvent.click(likelyRadio);

    // Confirm button should be enabled
    const confirmBtn = screen.getByRole('button', { name: /confirm response/i });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Lunch', 'likely');
    });
  });

  it('renders closed state when response window is past cutoff', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <StudentMealPanel
        meal={mockMealClosed}
        dateStr="2026-10-19"
        onSaveIntention={onSave}
      />
    );

    expect(screen.getByText(/Cutoff time \(6:30 AM\) has passed for today/i)).toBeInTheDocument();
    expect(screen.getByText('Response Closed')).toBeInTheDocument();
  });

  it('renders empty menu state gracefully without fake data', () => {
    const mealNoMenu: StudentMealItem = {
      ...mockMealOpen,
      menu_items: 'Menu not published yet',
    };
    render(
      <StudentMealPanel
        meal={mealNoMenu}
        dateStr="2026-10-19"
        onSaveIntention={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Menu not published yet/i)).toBeInTheDocument();
  });
});
