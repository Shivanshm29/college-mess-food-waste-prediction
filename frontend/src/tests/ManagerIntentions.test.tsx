import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ManagerIntentions } from '../pages/ManagerIntentions';
import { intentionsApi } from '../api/intentions';
import type { DateIntentionsSummary, PaginatedManagerIntentions } from '../types';

vi.mock('../api/intentions', () => ({
  intentionsApi: {
    getSummary: vi.fn(),
    getIntentions: vi.fn(),
    getRoster: vi.fn(),
    exportTrainingDataUrl: vi.fn().mockReturnValue('/api/intentions/export?format=csv'),
  },
}));

const mockSummary: DateIntentionsSummary = {
  date: '2026-10-27',
  configured_capacity: 556,
  total_students_enrolled: 556,
  total_unique_students: 12,
  total_submitted_intentions: 28,
  meals: [
    {
      meal_type: 'Breakfast',
      likely_count: 10,
      unlikely_count: 2,
      unsure_count: 0,
      total_submitted: 12,
      no_response_count: 544,
      turnout_percentage: 1.8,
    },
    {
      meal_type: 'Lunch',
      likely_count: 8,
      unlikely_count: 1,
      unsure_count: 0,
      total_submitted: 9,
      no_response_count: 547,
      turnout_percentage: 1.4,
    },
    {
      meal_type: 'Dinner',
      likely_count: 6,
      unlikely_count: 1,
      unsure_count: 0,
      total_submitted: 7,
      no_response_count: 549,
      turnout_percentage: 1.1,
    },
  ],
};

const mockList: PaginatedManagerIntentions = {
  total: 2,
  page: 1,
  page_size: 15,
  total_pages: 1,
  items: [
    {
      id: 1,
      student_id: 101,
      student_name: 'Rahul Sharma',
      student_username: 'CS202401',
      hostel_block: 'A',
      room_number: '101',
      meal_date: '2026-10-27',
      meal_type: 'Breakfast',
      intention_status: 'likely',
      created_at: '2026-10-26T18:00:00',
      updated_at: '2026-10-26T18:30:00',
    },
    {
      id: 2,
      student_id: 102,
      student_name: 'Priya Patel',
      student_username: 'EC202402',
      hostel_block: 'B',
      room_number: '204',
      meal_date: '2026-10-27',
      meal_type: 'Lunch',
      intention_status: 'unlikely',
      created_at: '2026-10-26T19:00:00',
      updated_at: '2026-10-26T19:00:00',
    },
  ],
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ManagerIntentions page component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (intentionsApi.getSummary as any).mockResolvedValue(mockSummary);
    (intentionsApi.getIntentions as any).mockResolvedValue(mockList);
  });

  it('renders summary statistics and distinct unique students count', async () => {
    renderWithRouter(<ManagerIntentions />);

    expect(screen.getByText('Student Attendance Intentions')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('28')).toBeInTheDocument();
    });

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders individual intentions table with student info and statuses', async () => {
    renderWithRouter(<ManagerIntentions />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByText(/@CS202401/)).toBeInTheDocument();
      expect(screen.getByText('Priya Patel')).toBeInTheDocument();
      expect(screen.getByText(/@EC202402/)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Likely to attend').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not attending').length).toBeGreaterThan(0);
  });

  it('toggles between chart view and accessible data table', async () => {
    renderWithRouter(<ManagerIntentions />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show accessible table/i })).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /show accessible table/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('columnheader', { name: /Likely to Attend/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Likely Turnout %/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Chart' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Chart' }));
    expect(screen.getByRole('button', { name: /show accessible table/i })).toBeInTheDocument();
  });

  it('filters by meal type and calls API with meal_type param', async () => {
    renderWithRouter(<ManagerIntentions />);

    await waitFor(() => {
      expect(intentionsApi.getIntentions).toHaveBeenCalled();
    });

    const mealFilterSelect = screen.getByLabelText(/filter by meal/i);
    fireEvent.change(mealFilterSelect, { target: { value: 'Breakfast' } });

    await waitFor(() => {
      expect(intentionsApi.getIntentions).toHaveBeenCalledWith(
        expect.objectContaining({
          meal_type: 'Breakfast',
        })
      );
    });
  });

  it('handles empty results gracefully without crashing', async () => {
    (intentionsApi.getIntentions as any).mockResolvedValue({
      total: 0,
      page: 1,
      page_size: 15,
      total_pages: 0,
      items: [],
    });

    renderWithRouter(<ManagerIntentions />);

    await waitFor(() => {
      expect(screen.getByText(/No student intentions recorded/i)).toBeInTheDocument();
    });
  });

  it('displays HCI clarification note stating intentions are not verified attendance', async () => {
    renderWithRouter(<ManagerIntentions />);

    await waitFor(() => {
      expect(screen.getByText(/Operational Headcount Interpretation:/i)).toBeInTheDocument();
      expect(screen.getByText(/voluntary self-reported intentions/i)).toBeInTheDocument();
    });
  });

  it('opens student names roster modal and displays categorized student intentions', async () => {
    (intentionsApi.getRoster as any).mockResolvedValue({
      date: '2026-10-27',
      meal_type: null,
      total_responded: 2,
      likely_count: 1,
      unlikely_count: 1,
      unsure_count: 0,
      students_likely: [
        {
          id: 1,
          student_id: 101,
          student_name: 'Rahul Sharma',
          student_username: 'CS202401',
          hostel_block: 'Block A',
          room_number: '101',
          meal_date: '2026-10-27',
          meal_type: 'Breakfast',
          intention_status: 'likely',
          notes: null,
          updated_at: '2026-10-26T18:30:00',
        },
      ],
      students_unlikely: [
        {
          id: 2,
          student_id: 102,
          student_name: 'Priya Patel',
          student_username: 'EC202402',
          hostel_block: 'Block B',
          room_number: '204',
          meal_date: '2026-10-27',
          meal_type: 'Lunch',
          intention_status: 'unlikely',
          notes: 'Going home',
          updated_at: '2026-10-26T19:00:00',
        },
      ],
      students_unsure: [],
      all_students: [
        {
          id: 1,
          student_id: 101,
          student_name: 'Rahul Sharma',
          student_username: 'CS202401',
          hostel_block: 'Block A',
          room_number: '101',
          meal_date: '2026-10-27',
          meal_type: 'Breakfast',
          intention_status: 'likely',
          notes: null,
          updated_at: '2026-10-26T18:30:00',
        },
        {
          id: 2,
          student_id: 102,
          student_name: 'Priya Patel',
          student_username: 'EC202402',
          hostel_block: 'Block B',
          room_number: '204',
          meal_date: '2026-10-27',
          meal_type: 'Lunch',
          intention_status: 'unlikely',
          notes: 'Going home',
          updated_at: '2026-10-26T19:00:00',
        },
      ],
    });

    renderWithRouter(<ManagerIntentions />);

    const viewNamesBtn = await screen.findByRole('button', { name: /view student names \(yes \/ no \/ maybe\)/i });
    expect(viewNamesBtn).toBeInTheDocument();
    fireEvent.click(viewNamesBtn);

    // Modal dialog should open and load roster
    await waitFor(() => {
      expect(screen.getByText('Student Intentions Names List')).toBeInTheDocument();
      expect(screen.getByText('Yes / Attending (1)')).toBeInTheDocument();
      expect(screen.getByText('No / Not Attending (1)')).toBeInTheDocument();
      expect(screen.getByText('Maybe / Unsure (0)')).toBeInTheDocument();
    });
  });
});
