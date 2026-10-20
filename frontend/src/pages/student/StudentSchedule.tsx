import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import { ScheduleResponse, ScheduleDay, IntentionChoice } from '../../types/student';
import { StudentMealPanel } from '../../components/student/StudentMealPanel';
import { StudentDashboardSkeleton } from '../../components/student/StudentSkeleton';
import { StudentBadge } from '../../components/student/StudentBadge';
import { LiveAnnouncer } from '../../components/LiveAnnouncer';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const StudentSchedule: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [announcement, setAnnouncement] = useState<string>('');
  const [submittingMeal, setSubmittingMeal] = useState<string | null>(null);

  const loadSchedule = async (startDate?: string) => {
    try {
      setError(null);
      const res = await studentApi.getSchedule({
        start_date: startDate,
        days: 7,
      });
      setScheduleData(res);

      // Auto-select today if present, or first day
      const todayIdx = res.days.findIndex((d) => d.is_today);
      if (todayIdx !== -1) {
        setSelectedDayIndex(todayIdx);
      } else {
        setSelectedDayIndex(0);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load meal schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleSaveIntention = async (mealType: string, choice: IntentionChoice) => {
    if (!scheduleData || !scheduleData.days[selectedDayIndex]) return;
    const currentDay = scheduleData.days[selectedDayIndex];

    try {
      setSubmittingMeal(mealType);
      setAnnouncement(`Saving intention for ${mealType} on ${currentDay.date}...`);

      await studentApi.saveIntention({
        date: currentDay.date,
        meal_type: mealType as any,
        status: choice,
      });

      setAnnouncement(`Successfully saved intention for ${mealType}.`);
      await loadSchedule(scheduleData.days[0]?.date);
    } catch (err: any) {
      setAnnouncement(`Failed to save intention: ${err.message}`);
      throw err;
    } finally {
      setSubmittingMeal(null);
    }
  };

  const handleWithdrawIntention = async (intentionId: number) => {
    try {
      setAnnouncement('Withdrawing meal intention...');
      await studentApi.withdrawIntention(intentionId);
      setAnnouncement('Meal intention withdrawn.');
      if (scheduleData) {
        await loadSchedule(scheduleData.days[0]?.date);
      }
    } catch (err: any) {
      setAnnouncement(`Failed to withdraw intention: ${err.message}`);
      throw err;
    }
  };

  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
    if (scheduleData?.days[index]) {
      const d = scheduleData.days[index];
      setAnnouncement(`Viewing schedule for ${d.day_name}, ${d.date}`);
    }
  };

  const handlePreviousDay = () => {
    if (selectedDayIndex > 0) {
      handleDaySelect(selectedDayIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (scheduleData && selectedDayIndex < scheduleData.days.length - 1) {
      handleDaySelect(selectedDayIndex + 1);
    }
  };

  if (isLoading) {
    return <StudentDashboardSkeleton />;
  }

  if (error || !scheduleData) {
    return (
      <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl max-w-lg mx-auto my-12 shadow-sm">
        <AlertCircle className="w-10 h-10 text-[#9C4221] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1A1D1B]">Unable to Load Meal Schedule</h2>
        <p className="text-xs text-[#68746C] mt-1">{error || 'Please try again later.'}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            loadSchedule();
          }}
          className="mt-4 px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-md hover:bg-[#2D6A4F] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const selectedDay: ScheduleDay | undefined = scheduleData.days[selectedDayIndex];

  return (
    <div className="space-y-6">
      <LiveAnnouncer message={announcement} />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D1B] tracking-tight">
            Meal Schedule & Intentions
          </h1>
          <p className="text-xs sm:text-sm text-[#68746C] mt-0.5">
            Browse menus for the upcoming week and submit your meal attendance in advance.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F1F3F0] rounded-lg self-start sm:self-auto border border-[#E2E6DF]">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'day'
                ? 'bg-white text-[#1B4332] shadow-2xs'
                : 'text-[#68746C] hover:text-[#1A1D1B]'
            }`}
          >
            Day View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'week'
                ? 'bg-white text-[#1B4332] shadow-2xs'
                : 'text-[#68746C] hover:text-[#1A1D1B]'
            }`}
          >
            Full Week List
          </button>
        </div>
      </div>

      {/* 7-Day Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Days of the week"
        className="grid grid-cols-2 sm:grid-cols-7 gap-2 overflow-x-auto pb-1"
      >
        {scheduleData.days.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          const intentionsCount = day.meals.filter((m) => m.current_intention).length;
          const allAnswered = intentionsCount === 3;

          return (
            <button
              key={day.date}
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleDaySelect(idx)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#1B4332] bg-[#EBF7EE] shadow-2xs ring-2 ring-[#2D6A4F]/20'
                  : 'border-[#E8ECE6] bg-white hover:bg-[#FAFBF9] hover:border-[#CCD5CA]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isSelected ? 'text-[#1B4332]' : 'text-[#68746C]'
                    }`}
                  >
                    {day.day_name.slice(0, 3)}
                  </span>
                  {day.is_today && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#2D6A4F] text-white rounded">
                      Today
                    </span>
                  )}
                </div>
                <div
                  className={`text-base font-bold mt-1 ${
                    isSelected ? 'text-[#1A1D1B]' : 'text-[#242926]'
                  }`}
                >
                  {new Date(day.date).getDate()} {new Date(day.date).toLocaleDateString([], { month: 'short' })}
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                {allAnswered ? (
                  <span className="inline-flex items-center gap-1 text-[#2D6A4F] font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> All set
                  </span>
                ) : intentionsCount > 0 ? (
                  <span className="text-[#68746C]">{intentionsCount}/3 planned</span>
                ) : (
                  <span className="text-[#8A968E] italic">Pending</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* View Mode Content */}
      {viewMode === 'day' && selectedDay && (
        <section aria-label={`Schedule for ${selectedDay.day_name}, ${selectedDay.date}`} className="space-y-4">
          {/* Day Navigation Bar */}
          <div className="flex items-center justify-between bg-white border border-[#E8ECE6] rounded-xl px-5 py-3.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePreviousDay}
              disabled={selectedDayIndex === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#E2E6DF] text-[#4C554F] hover:bg-[#FAFBF9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Go to previous day"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Day</span>
            </button>

            <div className="text-center">
              <h2 className="text-base font-bold text-[#1A1D1B]">
                {selectedDay.day_name}, {selectedDay.date}
              </h2>
              {selectedDay.is_today && (
                <span className="text-[11px] font-semibold text-[#2D6A4F]">
                  Today's Active Schedule
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={selectedDayIndex === scheduleData.days.length - 1}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#E2E6DF] text-[#4C554F] hover:bg-[#FAFBF9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Go to next day"
            >
              <span>Next Day</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Meals for Selected Day */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {selectedDay.meals.map((meal) => (
              <StudentMealPanel
                key={`${selectedDay.date}-${meal.meal_type}`}
                meal={meal}
                dateStr={selectedDay.date}
                onSaveIntention={handleSaveIntention}
                onWithdrawIntention={handleWithdrawIntention}
                isSubmitting={submittingMeal === meal.meal_type}
              />
            ))}
          </div>
        </section>
      )}

      {viewMode === 'week' && (
        <section aria-label="Full week chronological schedule" className="space-y-6">
          {scheduleData.days.map((day) => (
            <div
              key={day.date}
              className={`bg-white border rounded-xl p-5 shadow-2xs space-y-4 ${
                day.is_today ? 'border-[#2D6A4F] ring-1 ring-[#2D6A4F]' : 'border-[#E8ECE6]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F0]">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-[#1A1D1B]">
                    {day.day_name}, {day.date}
                  </span>
                  {day.is_today && (
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-[#2D6A4F] text-white rounded">
                      Today
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {day.meals.map((meal) => (
                  <div
                    key={`${day.date}-${meal.meal_type}`}
                    className="p-4 rounded-lg bg-[#FAFBF9] border border-[#E8ECE6] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A1D1B]">{meal.meal_type}</span>
                      <span className="text-[11px] text-[#68746C]">{meal.time_window}</span>
                    </div>

                    <p className="text-xs text-[#4C554F] line-clamp-2">
                      {meal.menu_items || 'Regular menu'}
                    </p>

                    <div className="pt-2 border-t border-[#E8ECE6] flex items-center justify-between">
                      <span className="text-[11px] text-[#68746C]">Cutoff: {meal.cutoff_time}</span>
                      {meal.current_intention ? (
                        <StudentBadge status={meal.current_intention.status} size="sm" />
                      ) : (
                        <span className="text-[11px] text-[#8A968E] italic">Unset</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
