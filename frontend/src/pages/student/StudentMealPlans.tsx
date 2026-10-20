import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import { MealIntention } from '../../types/student';
import { StudentBadge } from '../../components/student/StudentBadge';
import { LiveAnnouncer } from '../../components/LiveAnnouncer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  Calendar,
  Filter,
  Info,
  Clock,
  Trash2,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Sunrise,
  Sun,
  Moon,
  UtensilsCrossed,
} from 'lucide-react';

export const StudentMealPlans: React.FC = () => {
  const [intentions, setIntentions] = useState<MealIntention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [announcement, setAnnouncement] = useState<string>('');

  // Confirmation dialog for withdrawal
  const [withdrawTarget, setWithdrawTarget] = useState<MealIntention | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  const loadIntentions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await studentApi.getIntentions({
        period: periodFilter,
        meal_type: mealFilter === 'all' ? undefined : mealFilter,
      });
      setIntentions(res);
    } catch (err: any) {
      setError(err.message || 'Unable to load meal plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntentions();
  }, [periodFilter, mealFilter]);

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    try {
      setIsWithdrawing(true);
      await studentApi.withdrawIntention(withdrawTarget.id);
      setAnnouncement(`Withdrew response for ${withdrawTarget.meal_type} on ${withdrawTarget.date}.`);
      setWithdrawTarget(null);
      await loadIntentions();
    } catch (err: any) {
      setAnnouncement(`Failed to withdraw: ${err.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'Breakfast':
        return <Sunrise className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />;
      case 'Lunch':
        return <Sun className="w-4 h-4 text-[#D97706]" aria-hidden="true" />;
      case 'Dinner':
      default:
        return <Moon className="w-4 h-4 text-[#1B4332]" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-6">
      <LiveAnnouncer message={announcement} />

      {/* Page Title & Intro */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D1B] tracking-tight">
          My Meal Plans & Intentions
        </h1>
        <p className="text-xs sm:text-sm text-[#68746C] mt-0.5">
          Review your attendance intentions across upcoming and previous meals.
        </p>
      </div>

      {/* Honest Privacy & Purpose Banner (HCI Usability Heuristic #10 & #2) */}
      <div className="p-4 bg-[#FAFBF9] border border-[#CCD5CA] rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-[#2D6A4F] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 text-xs text-[#4C554F] leading-relaxed">
          <p className="font-semibold text-[#1A1D1B]">
            Intentions are voluntary planning indicators, not verified bookings
          </p>
          <p>
            Your responses give the kitchen staff aggregated headcounts to plan ingredient purchases and preparation volumes. Setting an intention does not charge your account or penalize you if your plans change.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E8ECE6] rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Period Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F1F3F0] rounded-lg border border-[#E2E6DF]">
          {(['upcoming', 'past', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPeriodFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                periodFilter === tab
                  ? 'bg-white text-[#1B4332] shadow-2xs'
                  : 'text-[#68746C] hover:text-[#1A1D1B]'
              }`}
            >
              {tab === 'all' ? 'All Time' : tab}
            </button>
          ))}
        </div>

        {/* Meal Type Filter Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="meal-filter-select" className="text-xs font-medium text-[#68746C] shrink-0">
            Meal:
          </label>
          <select
            id="meal-filter-select"
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-md px-3 py-1.5 font-medium text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
          >
            <option value="all">All Meals</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-[#FBEBE8] border border-[#F5C2B6] rounded-xl flex items-center gap-2 text-xs text-[#9C4221]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Intentions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-18 bg-white border border-[#E8ECE6] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : intentions.length === 0 ? (
        <div className="bg-white border border-[#E8ECE6] rounded-xl p-10 text-center space-y-3">
          <UtensilsCrossed className="w-10 h-10 text-[#CCD5CA] mx-auto" />
          <h2 className="text-sm font-bold text-[#1A1D1B]">No Meal Plans Found</h2>
          <p className="text-xs text-[#68746C] max-w-sm mx-auto">
            {periodFilter === 'upcoming'
              ? 'You have not submitted attendance intentions for upcoming meals yet.'
              : 'No recorded meal intentions match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {intentions.map((plan) => {
            const planDate = new Date(plan.date);
            const isFuture = planDate >= new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={plan.id}
                className="bg-white border border-[#E8ECE6] rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#CCD5CA] transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-[#FAFBF9] border border-[#E8ECE6] shrink-0">
                    {getMealIcon(plan.meal_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1A1D1B]">{plan.meal_type}</span>
                      <span className="text-xs text-[#68746C]">
                        &bull; {plan.date} ({planDate.toLocaleDateString([], { weekday: 'short' })})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8A968E]">
                      <Clock className="w-3 h-3" />
                      <span>
                        Last updated {new Date(plan.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-[#F1F3F0]">
                  <StudentBadge status={plan.status} />

                  {isFuture && (
                    <button
                      type="button"
                      onClick={() => setWithdrawTarget(plan)}
                      className="p-1.5 text-[#68746C] hover:text-[#9C4221] hover:bg-[#FBEBE8] rounded-md transition-colors"
                      title="Withdraw this intention"
                      aria-label={`Withdraw intention for ${plan.meal_type} on ${plan.date}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Withdrawing Intention */}
      <ConfirmDialog
        isOpen={!!withdrawTarget}
        title="Withdraw Meal Intention?"
        message={`Are you sure you want to withdraw your response for ${withdrawTarget?.meal_type} on ${withdrawTarget?.date}? You can resubmit an intention anytime before the response cutoff.`}
        confirmLabel="Yes, Withdraw Intention"
        cancelLabel="Keep Intention"
        isDestructive={true}
        isLoading={isWithdrawing}
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />
    </div>
  );
};
