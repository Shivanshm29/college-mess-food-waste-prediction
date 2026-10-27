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

  it('prompts confirmation modal before withdrawing an intention (Rule 5 & 6)', async () => {
    const onWithdraw = vi.fn().mockResolvedValue(undefined);
    const mealWithIntention: StudentMealItem = {
      ...mockMealOpen,
      current_intention: {
        id: 42,
        user_id: 1,
        date: '2026-10-19',
        meal_type: 'Lunch',
        status: 'likely',
        notes: '',
        created_at: '2026-10-18T10:00:00',
        updated_at: '2026-10-18T10:00:00',
      },
    };

    render(
      <StudentMealPanel
        meal={mealWithIntention}
        dateStr="2026-10-19"
        onSaveIntention={vi.fn().mockResolvedValue(undefined)}
        onWithdrawIntention={onWithdraw}
      />
    );

    // Find and click the withdraw button
    const withdrawBtn = screen.getByRole('button', { name: /withdraw/i });
    expect(withdrawBtn).toBeInTheDocument();
    fireEvent.click(withdrawBtn);

    // Confirm dialog should appear
    expect(screen.getByText('Withdraw Meal Intention')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to withdraw your Lunch intention/i)).toBeInTheDocument();

    // Confirm the withdrawal
    const confirmWithdrawBtn = screen.getByRole('button', { name: 'Withdraw Response' });
    fireEvent.click(confirmWithdrawBtn);

    await waitFor(() => {
      expect(onWithdraw).toHaveBeenCalledWith(42);
      expect(screen.getByText('Your response was withdrawn successfully.')).toBeInTheDocument();
    });
  });

  it('displays informative feedback when updating an existing intention (Rule 3)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const mealWithIntention: StudentMealItem = {
      ...mockMealOpen,
      current_intention: {
        id: 42,
        user_id: 1,
        date: '2026-10-19',
        meal_type: 'Lunch',
        status: 'likely',
        notes: '',
        created_at: '2026-10-18T10:00:00',
        updated_at: '2026-10-18T10:00:00',
      },
    };

    render(
      <StudentMealPanel
        meal={mealWithIntention}
        dateStr="2026-10-19"
        onSaveIntention={onSave}
      />
    );

    // Click 'Change' to switch into edit mode (Golden Rule 6 & 8)
    const changeBtn = screen.getByRole('button', { name: /change/i });
    expect(changeBtn).toBeInTheDocument();
    fireEvent.click(changeBtn);

    // Switch selection to 'unlikely'
    const unlikelyRadio = screen.getByDisplayValue('unlikely');
    fireEvent.click(unlikelyRadio);

    const confirmBtn = screen.getByRole('button', { name: /confirm response/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Lunch', 'unlikely');
      expect(screen.getByText('Your meal intention has been updated.')).toBeInTheDocument();
    });
  });

  it('displays special menu notification banner without random dishes when is_special is true', () => {
    const mockSpecialMeal: StudentMealItem = {
      ...mockMealOpen,
      is_special: true,
      special_notice: 'Special festive dinner feast scheduled today.',
    };
    render(
      <StudentMealPanel
        meal={mockSpecialMeal}
        dateStr="2026-10-19"
        onSaveIntention={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText('Special Menu Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Special festive dinner feast scheduled today.')).toBeInTheDocument();
    expect(screen.getByText(/Curated chef's festive dishes will be served for this feast/i)).toBeInTheDocument();
  });
});

