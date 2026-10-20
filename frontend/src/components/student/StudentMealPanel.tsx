import React, { useState } from 'react';
import {
  Sunrise,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  AlertCircle,
  Edit2,
  Undo2,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react';
import { IntentionChoice, StudentMealItem } from '../../types/student';
import { StudentBadge } from './StudentBadge';

interface StudentMealPanelProps {
  meal: StudentMealItem;
  dateStr: string;
  onSaveIntention: (mealType: string, choice: IntentionChoice) => Promise<void>;
  onWithdrawIntention?: (intentionId: number) => Promise<void>;
  isSubmitting?: boolean;
}

export const StudentMealPanel: React.FC<StudentMealPanelProps> = ({
  meal,
  dateStr,
  onSaveIntention,
  onWithdrawIntention,
  isSubmitting = false,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<IntentionChoice | null>(
    (meal.current_intention?.status as IntentionChoice) || null
  );
  const [isEditing, setIsEditing] = useState<boolean>(!meal.current_intention);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const getMealIcon = () => {
    switch (meal.meal_type) {
      case 'Breakfast':
        return <Sunrise className="w-5 h-5 text-[#2D6A4F]" aria-hidden="true" />;
      case 'Lunch':
        return <Sun className="w-5 h-5 text-[#D97706]" aria-hidden="true" />;
      case 'Dinner':
      default:
        return <Moon className="w-5 h-5 text-[#1B4332]" aria-hidden="true" />;
    }
  };

  const hasMenu =
    meal.menu_items &&
    meal.menu_items.trim().length > 0 &&
    meal.menu_items !== 'Menu not published yet';

  const formatSavedTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleSelect = (choice: IntentionChoice) => {
    if (meal.is_closed) return;
    setSelectedChoice(choice);
    setPanelError(null);
  };

  const handleSubmit = async () => {
    if (!selectedChoice) {
      setPanelError('Please select whether you expect to attend before confirming.');
      return;
    }
    try {
      setPanelError(null);
      await onSaveIntention(meal.meal_type, selectedChoice);
      setIsEditing(false);
      setSaveSuccessMsg('Intention saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      setPanelError(
        err.message || 'We could not save your response. Your selection has been preserved—please try again.'
      );
    }
  };

  const handleWithdraw = async () => {
    if (!meal.current_intention) return;
    try {
      setPanelError(null);
      if (onWithdrawIntention) {
        await onWithdrawIntention(meal.current_intention.id);
        setSelectedChoice(null);
        setIsEditing(true);
        setSaveSuccessMsg('Intention withdrawn.');
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setPanelError(err.message || 'Unable to withdraw intention. Response window may have closed.');
    }
  };

  return (
    <article
      className={`rounded-xl border transition-all duration-200 bg-white ${
        meal.is_closed
          ? 'border-[#E2E8F0] opacity-95 bg-[#FAFBF9]'
          : selectedChoice === 'likely'
          ? 'border-[#95D5B2] shadow-sm'
          : selectedChoice === 'unlikely'
          ? 'border-[#F4C5B6] shadow-sm'
          : 'border-[#E2E8F0] shadow-2xs hover:border-[#CBD5E1]'
      }`}
      aria-labelledby={`meal-heading-${meal.meal_type}`}
    >
      {/* Meal Header */}
      <div className="p-4 sm:p-5 border-b border-[#F1F3F0] flex flex-wrap items-center justify-between gap-3 bg-[#FCFDFB] rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#EBF7EE] border border-[#D8F3DC]">
            {getMealIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                id={`meal-heading-${meal.meal_type}`}
                className="text-base font-bold text-[#1A1D1B]"
              >
                {meal.meal_type}
              </h3>
              <span className="text-xs font-medium text-[#4C554F] px-2 py-0.5 rounded-md bg-[#F1F3F0]">
                {meal.time_window}
              </span>
            </div>
            <p className="text-xs text-[#68746C] mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8A968E]" aria-hidden="true" />
              <span>
                {meal.is_closed ? (
                  <span className="text-[#9C4221] font-medium">Cutoff passed ({meal.cutoff_time})</span>
                ) : (
                  <span>Cutoff: Today at {meal.cutoff_time}</span>
                )}
              </span>
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div>
          {meal.is_closed && !meal.current_intention ? (
            <StudentBadge status="closed" customLabel="Response Closed" />
          ) : meal.current_intention ? (
            <StudentBadge status={meal.current_intention.status} />
          ) : (
            <StudentBadge status="pending" customLabel="Not answered" />
          )}
        </div>
      </div>

      {/* Menu Presentation */}
      <div className="p-4 sm:p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#68746C]">
              Scheduled Menu
            </span>
            <span className="text-[11px] font-medium text-[#2D6A4F] bg-[#EBF7EE] px-2 py-0.5 rounded border border-[#D8F3DC]">
              {meal.category}
            </span>
          </div>

          {hasMenu ? (
            <div className="p-3 bg-[#F8F9FA] border border-[#E8ECE6] rounded-lg">
              <p className="text-sm font-medium text-[#242926] leading-relaxed">
                {meal.menu_items}
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FAFBF9] border border-dashed border-[#CBD5E1] rounded-lg flex items-center gap-2.5 text-xs text-[#68746C]">
              <UtensilsCrossed className="w-4 h-4 text-[#8A968E] flex-shrink-0" aria-hidden="true" />
              <span>Menu not published yet. Kitchen staff will update dishes shortly.</span>
            </div>
          )}
        </div>

        {/* Feedback / Save notice */}
        {saveSuccessMsg && (
          <div
            role="status"
            className="p-3 bg-[#D8F3DC] border border-[#95D5B2] text-[#1B4332] text-xs font-medium rounded-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {panelError && (
          <div
            role="alert"
            className="p-3 bg-[#FDF2EE] border border-[#F4C5B6] text-[#9C4221] text-xs font-medium rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-[#9C4221] flex-shrink-0" />
            <span>{panelError}</span>
          </div>
        )}

        {/* Intention Interaction Section */}
        {meal.is_closed ? (
          /* Response Window Closed state */
          <div className="p-3.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg flex items-start gap-2.5 text-xs text-[#4C554F]">
            <Clock className="w-4 h-4 text-[#8A968E] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#242926]">Response Window Closed</p>
              <p className="mt-0.5 text-[#68746C]">
                {meal.closure_reason ||
                  `Cutoff passed at ${meal.cutoff_time} for meal batch preparation. Responses can no longer be modified.`}
              </p>
              {meal.current_intention && (
                <p className="mt-1.5 font-medium text-[#1B4332]">
                  Your registered intention was:{' '}
                  <span className="capitalize">{meal.current_intention.status} to attend</span>.
                </p>
              )}
            </div>
          </div>
        ) : !isEditing && meal.current_intention ? (
          /* Confirmed Saved State */
          <div className="p-4 bg-[#F8FAF9] border border-[#D5DDD2] rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#68746C] block">Your Registered Intention</span>
                <div className="flex items-center gap-2 mt-1">
                  <StudentBadge status={meal.current_intention.status} size="md" />
                  <span className="text-xs text-[#4C554F]">
                    Saved at {formatSavedTime(meal.current_intention.updated_at || meal.current_intention.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#242926] text-xs font-medium rounded-md shadow-2xs focus-visible:ring-2 focus-visible:ring-[#2D6A4F] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#2D6A4F]" aria-hidden="true" />
                  <span>Change</span>
                </button>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#FEF2F2] text-[#9C4221] text-xs font-medium rounded-md shadow-2xs focus-visible:ring-2 focus-visible:ring-[#9C4221] transition-colors disabled:opacity-50"
                >
                  <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Withdraw</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Selection & Submission flow */
          <div className="space-y-3.5">
            <fieldset>
              <legend className="text-xs font-semibold text-[#242926] mb-2 block">
                Will you attend this meal?
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Option 1: Likely */}
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedChoice === 'likely'
                      ? 'border-[#2D6A4F] bg-[#D8F3DC]/40 text-[#1B4332] ring-1 ring-[#2D6A4F]'
                      : 'border-[#E2E8F0] bg-white text-[#343B36] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`intention-${meal.meal_type}-${dateStr}`}
                    value="likely"
                    checked={selectedChoice === 'likely'}
                    onChange={() => handleSelect('likely')}
                    className="w-4 h-4 text-[#2D6A4F] focus:ring-[#2D6A4F] border-gray-300"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        selectedChoice === 'likely' ? 'text-[#2D6A4F]' : 'text-[#8A968E]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold">Likely to attend</span>
                  </div>
                </label>

                {/* Option 2: Not Likely */}
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedChoice === 'unlikely'
                      ? 'border-[#9C4221] bg-[#FDF2EE] text-[#9C4221] ring-1 ring-[#9C4221]'
                      : 'border-[#E2E8F0] bg-white text-[#343B36] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`intention-${meal.meal_type}-${dateStr}`}
                    value="unlikely"
                    checked={selectedChoice === 'unlikely'}
                    onChange={() => handleSelect('unlikely')}
                    className="w-4 h-4 text-[#9C4221] focus:ring-[#9C4221] border-gray-300"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <XCircle
                      className={`w-4 h-4 ${
                        selectedChoice === 'unlikely' ? 'text-[#9C4221]' : 'text-[#8A968E]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold">Not likely to attend</span>
                  </div>
                </label>

                {/* Option 3: Unsure */}
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedChoice === 'unsure'
                      ? 'border-[#4A5568] bg-[#F1F5F9] text-[#1E293B] ring-1 ring-[#4A5568]'
                      : 'border-[#E2E8F0] bg-white text-[#343B36] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`intention-${meal.meal_type}-${dateStr}`}
                    value="unsure"
                    checked={selectedChoice === 'unsure'}
                    onChange={() => handleSelect('unsure')}
                    className="w-4 h-4 text-[#4A5568] focus:ring-[#4A5568] border-gray-300"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HelpCircle
                      className={`w-4 h-4 ${
                        selectedChoice === 'unsure' ? 'text-[#4A5568]' : 'text-[#8A968E]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold">Unsure yet</span>
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Privacy notice & Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-[#68746C] flex items-center gap-1.5 leading-tight">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F] flex-shrink-0" aria-hidden="true" />
                <span>Your response helps the mess estimate meal demand. It is an intention, not a confirmed booking.</span>
              </p>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                {meal.current_intention && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChoice(meal.current_intention?.status as IntentionChoice);
                      setIsEditing(false);
                    }}
                    className="px-3 py-2 text-xs font-medium text-[#4C554F] hover:text-[#1A1D1B] bg-transparent"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedChoice || isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#2D6A4F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Response</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
