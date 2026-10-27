import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NewPrediction } from '../pages/NewPrediction';
import { predictionsApi } from '../api/predictions';

vi.mock('../api/predictions', () => ({
  predictionsApi: {
    getMenuOptions: vi.fn().mockResolvedValue({
      Breakfast: ['Poha', 'Idli, Sambhar, Coconut Chutney'],
      Lunch: ['Loki Kofta', 'Paneer Butter Masala'],
      Snacks: ['Vada Pav', 'Samosa'],
      Dinner: ['Matar Mushroom', 'Chole'],
    }),
    getNextMealFeatures: vi.fn(),
    create: vi.fn(),
    getRecommendations: vi.fn().mockResolvedValue([]),
  },
}));

describe('NewPrediction Next Available Meal Shortcut (HCI Golden Rule 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (predictionsApi.getMenuOptions as any).mockResolvedValue({
      Breakfast: ['Idli, Sambhar, Coconut Chutney'],
      Lunch: ['Loki Kofta'],
      Snacks: ['Vada Pav'],
      Dinner: ['Matar Mushroom'],
    });
  });

  it('renders the Next Meal Shortcut card and fill button', async () => {
    render(
      <BrowserRouter>
        <NewPrediction />
      </BrowserRouter>
    );

    expect(screen.getByText('Next Meal Shortcut')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fill next available meal/i })).toBeInTheDocument();
  });

  it('populates all prediction input features when clicking Fill Next Available Meal', async () => {
    (predictionsApi.getNextMealFeatures as any).mockResolvedValue({
      date: '2026-10-27',
      day_of_week: 'Tuesday',
      is_tomorrow: false,
      meal_type: 'Lunch',
      main_menu_items: 'Loki Kofta, Dal, Rice, Chapati, Dahi, Lasun Chutney, Fryums',
      special_meal: 'No',
      mess_capacity_students: 556,
      is_holiday: false,
      exam_on_day: false,
      college_event: false,
      weather_condition: 'Clear',
      notes: "Auto-filled shortcut for Today's Lunch",
      time_window: '12:30 PM - 2:30 PM',
      label: "Today's Lunch",
    });

    render(
      <BrowserRouter>
        <NewPrediction />
      </BrowserRouter>
    );

    const fillBtn = screen.getByRole('button', { name: /fill next available meal/i });
    fireEvent.click(fillBtn);

    await waitFor(() => {
      // Check date input
      const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
      expect(dateInput.value).toBe('2026-10-27');

      // Check meal type select
      const mealSelect = screen.getByLabelText(/meal type/i) as HTMLSelectElement;
      expect(mealSelect.value).toBe('Lunch');

      // Check menu items
      const menuTextarea = screen.getByLabelText(/menu items/i) as HTMLTextAreaElement;
      expect(menuTextarea.value).toContain('Loki Kofta');

      // Check mess capacity
      const capacityInput = screen.getByLabelText(/mess capacity/i) as HTMLInputElement;
      expect(capacityInput.value).toBe('556');

      // Check shortcut applied feedback banner
      expect(screen.getByText(/Shortcut Applied:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /undo shortcut/i })).toBeInTheDocument();
    });
  });

  it('permits easy reversal of shortcut via Undo button (HCI Golden Rule 6)', async () => {
    (predictionsApi.getNextMealFeatures as any).mockResolvedValue({
      date: '2026-10-28',
      day_of_week: 'Wednesday',
      is_tomorrow: true,
      meal_type: 'Breakfast',
      main_menu_items: 'Mendu Wada, Sambhar, Groundnut Chutney',
      special_meal: 'No',
      mess_capacity_students: 556,
      is_holiday: false,
      exam_on_day: false,
      college_event: false,
      weather_condition: 'Clear',
      notes: "Auto-filled shortcut for Tomorrow's Breakfast",
      time_window: '7:30 AM - 9:30 AM',
      label: "Tomorrow's Breakfast",
    });

    render(
      <BrowserRouter>
        <NewPrediction />
      </BrowserRouter>
    );

    // Initial date should be today
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    const initialDate = dateInput.value;

    // Click shortcut
    const fillBtn = screen.getByRole('button', { name: /fill next available meal/i });
    fireEvent.click(fillBtn);

    await waitFor(() => {
      expect(screen.getByText(/Shortcut Applied:/i)).toBeInTheDocument();
    });

    // Click Undo Shortcut
    const undoBtn = screen.getByRole('button', { name: /undo shortcut/i });
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(dateInput.value).toBe(initialDate);
      expect(screen.queryByText(/Shortcut Applied:/i)).not.toBeInTheDocument();
    });
  });
});
