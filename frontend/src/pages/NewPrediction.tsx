import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { predictionsApi } from '../api/predictions';
import type {
  MealType,
  MenuRecommendation,
  PredictionInput,
  PredictionRecord,
  SpecialMealType,
  WeatherType,
} from '../types';
import { LiveAnnouncer } from '../components/LiveAnnouncer';
import { MenuRecommendationsCard } from '../components/MenuRecommendationsCard';
import { getAutoDecidedMenu } from '../utils/menuSchedule';
import { determineNextAvailableMeal } from '../utils/nextMeal';
import {
  Utensils,
  Users,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info,
  RotateCcw,
  ArrowRight,
  Edit3,
  Lightbulb,
  Loader2,
  Check,
  Zap,
  Undo2,
} from 'lucide-react';

const predictionFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date (YYYY-MM-DD)'),
  meal_type: z.enum(['Breakfast', 'Lunch', 'Snacks', 'Dinner']),
  main_menu_items: z.string().min(1, 'Please enter or select menu items'),
  special_meal: z.enum(['No', 'Yes']),
  mess_capacity_students: z
    .number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(5000, 'Capacity cannot exceed 5000'),
  is_holiday: z.boolean(),
  exam_on_day: z.boolean(),
  college_event: z.boolean(),
  weather_condition: z.enum(['Clear', 'Cloudy', 'Hot', 'Humid', 'Rainy']),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional(),
});

type FormValues = z.infer<typeof predictionFormSchema>;

export const NewPrediction: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  const [menuOptions, setMenuOptions] = useState<Record<string, string[]>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<PredictionRecord | null>(null);
  const [isApplyingRec, setIsApplyingRec] = useState(false);
  const [formRecs, setFormRecs] = useState<MenuRecommendation[] | null>(null);
  const [isLoadingFormRecs, setIsLoadingFormRecs] = useState(false);
  const [formRecsError, setFormRecsError] = useState<string | null>(null);
  const [appliedBadgeMsg, setAppliedBadgeMsg] = useState<string | null>(null);
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);
  const [previousValues, setPreviousValues] = useState<FormValues | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const nextMealPreview = useMemo(() => determineNextAvailableMeal(), []);


  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const initialDate = getTodayDate();
  const initialD = new Date(initialDate + 'T00:00:00');
  const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const initialDayName = daysList[initialD.getDay()] || 'Wednesday';
  const initialMenu = getAutoDecidedMenu(initialDayName, 'Lunch', 'No');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(predictionFormSchema),
    defaultValues: {
      date: initialDate,
      meal_type: 'Lunch',
      main_menu_items: initialMenu,
      special_meal: 'No',
      mess_capacity_students: 556,
      is_holiday: false,
      exam_on_day: false,
      college_event: false,
      weather_condition: 'Clear',
      notes: '',
    },
  });

  const selectedDate = watch('date');
  const selectedMeal = watch('meal_type');
  const selectedSpecial = watch('special_meal');

  // Derive day of week & weekend status from selected date
  const derivedDay = useMemo(() => {
    if (!selectedDate) return { name: '', isWeekend: false };
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      if (isNaN(d.getTime())) return { name: '', isWeekend: false };
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      return { name: dayName, isWeekend };
    } catch {
      return { name: '', isWeekend: false };
    }
  }, [selectedDate]);

  // Auto-decide menu items whenever date, meal_type, or special_meal changes
  useEffect(() => {
    if (derivedDay.name && selectedMeal) {
      const autoMenu = getAutoDecidedMenu(
        derivedDay.name,
        selectedMeal as MealType,
        selectedSpecial as 'Yes' | 'No'
      );
      if (autoMenu) {
        setValue('main_menu_items', autoMenu, { shouldValidate: true });
      }
    }
  }, [derivedDay.name, selectedMeal, selectedSpecial, setValue]);

  useEffect(() => {
    const loadMenus = async () => {
      try {
        const opts = await predictionsApi.getMenuOptions();
        setMenuOptions(opts);
      } catch {
        // Fallback gracefully
      }
    };
    loadMenus();
  }, []);

  // When special meal is Yes, set menu to Special by default; when No, restore scheduled menu
  const handleSpecialMealChange = (val: 'Yes' | 'No') => {
    setValue('special_meal', val);
    if (val === 'Yes') {
      setValue('main_menu_items', 'Special', { shouldValidate: true });
    } else if (derivedDay.name && selectedMeal) {
      const regularMenu = getAutoDecidedMenu(derivedDay.name, selectedMeal as MealType, 'No');
      setValue('main_menu_items', regularMenu, { shouldValidate: true });
    }
  };

  const handleFillNextMeal = async () => {
    // Preserve current values so the manager can undo if needed (Shneiderman Golden Rule 6)
    setPreviousValues(watch());
    let nextMeal = determineNextAvailableMeal();

    try {
      const serverNext = await predictionsApi.getNextMealFeatures();
      if (serverNext) {
        nextMeal = serverNext;
      }
    } catch {
      // Fallback gracefully to local calculation
    }

    setValue('date', nextMeal.date, { shouldValidate: true, shouldDirty: true });
    setValue('meal_type', nextMeal.meal_type, { shouldValidate: true, shouldDirty: true });
    setValue('special_meal', nextMeal.special_meal, { shouldValidate: true, shouldDirty: true });
    setValue('main_menu_items', nextMeal.main_menu_items, { shouldValidate: true, shouldDirty: true });
    setValue('mess_capacity_students', nextMeal.mess_capacity_students, { shouldValidate: true, shouldDirty: true });
    setValue('is_holiday', nextMeal.is_holiday, { shouldValidate: true, shouldDirty: true });
    setValue('exam_on_day', nextMeal.exam_on_day, { shouldValidate: true, shouldDirty: true });
    setValue('college_event', nextMeal.college_event, { shouldValidate: true, shouldDirty: true });
    setValue('weather_condition', nextMeal.weather_condition, { shouldValidate: true, shouldDirty: true });
    setValue('notes', nextMeal.notes || '', { shouldValidate: true, shouldDirty: true });

    setShortcutFeedback(
      `Shortcut Applied: All features set for ${nextMeal.label} (${nextMeal.day_of_week}, ${nextMeal.date} • ${nextMeal.time_window}).`
    );
    setAnnouncement(
      `Populated all input features for next available meal: ${nextMeal.label} with scheduled menu "${nextMeal.main_menu_items}".`
    );
  };

  const handleUndoShortcut = () => {
    if (previousValues) {
      reset(previousValues);
      setPreviousValues(null);
      setShortcutFeedback(null);
      setAnnouncement('Reverted prediction inputs to previous values.');
    }
  };

  // Support direct navigation via ?shortcut=next_meal
  useEffect(() => {
    if (searchParams.get('shortcut') === 'next_meal') {
      handleFillNextMeal();
      searchParams.delete('shortcut');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);


  const onSubmit = async (values: FormValues) => {
    try {
      setSubmissionError(null);
      setAnnouncement('Generating prediction...');

      const payload: PredictionInput = {
        date: values.date,
        meal_type: values.meal_type as MealType,
        main_menu_items: values.main_menu_items.trim(),
        special_meal: values.special_meal as SpecialMealType,
        mess_capacity_students: values.mess_capacity_students,
        is_holiday: values.is_holiday,
        exam_on_day: values.exam_on_day,
        college_event: values.college_event,
        weather_condition: values.weather_condition as WeatherType,
        notes: values.notes?.trim() || null,
      };

      const result = await predictionsApi.create(payload);
      setCreatedResult(result);
      setAnnouncement('Prediction generated successfully. Prediction saved successfully.');
    } catch (err: any) {
      const msg = err.message || 'Unable to generate the prediction. Check the inputs and try again.';
      setSubmissionError(msg);
      setAnnouncement('Unable to generate the prediction. Check the inputs and try again.');
    }
  };

  const handleApplyRecommendation = async (rec: MenuRecommendation) => {
    try {
      setIsApplyingRec(true);
      setSubmissionError(null);
      setAnnouncement(`Applying recommended menu: ${rec.short_label}...`);

      const specialMealVal: SpecialMealType = rec.menu_items === 'Special' ? 'Yes' : 'No';
      setValue('main_menu_items', rec.menu_items, { shouldValidate: true });
      setValue('special_meal', specialMealVal, { shouldValidate: true });

      const payload: PredictionInput = {
        date: watch('date'),
        meal_type: watch('meal_type') as MealType,
        main_menu_items: rec.menu_items,
        special_meal: specialMealVal,
        mess_capacity_students: watch('mess_capacity_students'),
        is_holiday: watch('is_holiday'),
        exam_on_day: watch('exam_on_day'),
        college_event: watch('college_event'),
        weather_condition: watch('weather_condition') as WeatherType,
        notes: watch('notes')?.trim() || null,
      };

      const result = await predictionsApi.create(payload);
      setCreatedResult(result);
      setAppliedBadgeMsg(
        `Menu updated to "${rec.short_label}"! Attendance forecast increased by ${
          rec.student_delta >= 0 ? `+${rec.student_delta}` : `${rec.student_delta}`
        } students with ${result.expected_food_wastage_kg} kg estimated waste.`
      );
      setAnnouncement(
        `Applied recommended menu ${rec.short_label}. New forecast: ${result.expected_students} students and ${result.expected_food_wastage_kg} kg waste.`
      );
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to apply recommended menu.');
      setAnnouncement('Failed to apply recommended menu. Please try again.');
    } finally {
      setIsApplyingRec(false);
    }
  };

  const handleExploreFormRecs = async () => {
    try {
      setIsLoadingFormRecs(true);
      setFormRecsError(null);
      setAnnouncement('Evaluating alternative menus...');
      const dateVal = watch('date');
      const mealVal = watch('meal_type');
      const menuVal = watch('main_menu_items');
      const specialVal = watch('special_meal');

      const recs = await predictionsApi.getRecommendations({
        date: dateVal,
        meal_type: mealVal as MealType,
        main_menu_items: menuVal,
        special_meal: specialVal as SpecialMealType,
        mess_capacity_students: watch('mess_capacity_students'),
        is_holiday: watch('is_holiday'),
        exam_on_day: watch('exam_on_day'),
        college_event: watch('college_event'),
        weather_condition: watch('weather_condition') as WeatherType,
      });

      setFormRecs(recs);
      setAnnouncement(`Loaded ${recs.length} menu optimization recommendations.`);
    } catch (err: any) {
      setFormRecsError(err.message || 'Unable to load menu recommendations at this time.');
    } finally {
      setIsLoadingFormRecs(false);
    }
  };

  const handleSelectFormRec = (rec: MenuRecommendation) => {
    setValue('main_menu_items', rec.menu_items, { shouldValidate: true });
    if (rec.menu_items === 'Special') {
      setValue('special_meal', 'Yes');
    } else {
      setValue('special_meal', 'No');
    }
    setFormRecs(null);
    setAnnouncement(`Selected menu: ${rec.short_label}`);
  };

  const handleEditInputs = () => {
    setCreatedResult(null);
    setSubmissionError(null);
    setAppliedBadgeMsg(null);
    setAnnouncement('Returned to prediction form. Your previously entered inputs have been preserved for editing.');
  };

  const handleStartNew = () => {
    setCreatedResult(null);
    setSubmissionError(null);
    setAppliedBadgeMsg(null);
    setFormRecs(null);
    setShortcutFeedback(null);
    setPreviousValues(null);
    const today = getTodayDate();
    const d = new Date(today + 'T00:00:00');
    const dayName = daysList[d.getDay()] || 'Wednesday';
    reset({
      date: today,
      meal_type: 'Lunch',
      main_menu_items: getAutoDecidedMenu(dayName, 'Lunch', 'No'),
      special_meal: 'No',
      mess_capacity_students: 556,
      is_holiday: false,
      exam_on_day: false,
      college_event: false,
      weather_condition: 'Clear',
      notes: '',
    });
    setAnnouncement('Prediction form reset to scheduled meal defaults.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <LiveAnnouncer message={announcement} />

      {/* Page Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
          New Prediction
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Generate expected attendance, required food volume, and potential wastage forecasts.
        </p>
      </div>

      {/* Success View */}
      {createdResult ? (
        <div className="space-y-6">
          {appliedBadgeMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{appliedBadgeMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setAppliedBadgeMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs ml-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#15803D] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-[#15803D]">
                Prediction Successfully Generated
              </h2>
              <p className="text-xs text-[#166534] mt-0.5">
                Saved to database record #{createdResult.id} for {createdResult.date} ({createdResult.meal_type}).
              </p>
            </div>
          </div>


          {/* Three Separated Results Cards */}
          <section aria-labelledby="results-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-5">
            <h2 id="results-heading" className="text-base font-semibold text-[#1E293B]">
              Predicted Meal Requirements
            </h2>

            {/* Special Meal Operational Rule Banner */}
            {createdResult.special_meal === 'Yes' && (
              <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#B45309]">Special Meal Operational Guideline</p>
                  <p className="mt-0.5 text-[#78350F] leading-relaxed">
                    Attendance Target: <strong>{createdResult.special_meal_target ?? 523} students</strong> (94% minimum hall capacity rule).
                    The ML model forecast of <strong>{createdResult.expected_students} students</strong> is generated independently from historical features.
                  </p>
                </div>
              </div>
            )}

            {/* Advance Student Attendance Intentions Context (if submitted by students) */}
            {!!createdResult.intentions_total_submitted && createdResult.intentions_total_submitted > 0 && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start gap-3 text-xs text-blue-950">
                <Users className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="font-semibold text-blue-900">
                      Advance Student Attendance Intentions Logged
                    </p>
                    <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                      Contextual Data • Not Actual Attendance
                    </span>
                  </div>
                  <p className="mt-1 text-blue-800 leading-relaxed">
                    {createdResult.intentions_summary_note ||
                      `${createdResult.intentions_likely_count ?? 0} students submitted intention to attend out of ${createdResult.intentions_total_submitted} submitted responses.`}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Expected Students */}
              <div className="p-4 bg-[#F8FAFC] border-l-4 border-l-[#2563EB] border border-[#E2E8F0] rounded-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <span>Expected Students</span>
                  <Users className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                </div>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#1E293B]">
                    {createdResult.expected_students}
                  </span>
                  <span className="text-xs font-medium text-[#64748B]">students</span>
                </div>
                <p className="mt-1.5 text-xs text-[#64748B]">
                  Capacity: {createdResult.mess_capacity_students} (
                  {Math.round((createdResult.expected_students / createdResult.mess_capacity_students) * 100)}% turnout)
                </p>
              </div>

              {/* Expected Food Required (kg) */}
              <div className="p-4 bg-[#EFF6FF] border-l-4 border-l-[#1E40AF] border border-[#BFDBFE] rounded-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">
                  <span>Expected Food Required (kg)</span>
                  <Utensils className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                </div>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#1E40AF]">
                    {createdResult.expected_food_required_kg}
                  </span>
                  <span className="text-xs font-medium text-[#1E40AF]">kg</span>
                </div>
                <p className="mt-1.5 text-xs text-[#2563EB]">
                  ~{createdResult.food_per_student_kg ?? (createdResult.expected_food_required_kg / (createdResult.expected_students || 1)).toFixed(2)} kg per student
                </p>
              </div>

              {/* Expected Food Wastage (kg) */}
              <div className="p-4 bg-[#FFFBEB] border-l-4 border-l-[#B45309] border border-[#FDE68A] rounded-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-[#92400E] uppercase tracking-wider">
                  <span>Expected Food Wastage (kg)</span>
                  <Trash2 className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                </div>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#B45309]">
                    {createdResult.expected_food_wastage_kg}
                  </span>
                  <span className="text-xs font-medium text-[#92400E]">kg</span>
                </div>
                <p className="mt-1.5 text-xs text-[#B45309]">
                  {createdResult.waste_percentage ?? ((createdResult.expected_food_wastage_kg / (createdResult.expected_food_required_kg || 1)) * 100).toFixed(1)}% of prepared food
                </p>
              </div>
            </div>

            {/* Intelligent Menu Recommendations for Low Turnout / Waste Reduction */}
            {createdResult.menu_recommendations && createdResult.menu_recommendations.length > 0 && (
              <div className="pt-2">
                <MenuRecommendationsCard
                  recommendations={createdResult.menu_recommendations}
                  isLowTurnout={createdResult.is_low_turnout}
                  currentStudents={createdResult.expected_students}
                  capacity={createdResult.mess_capacity_students}
                  currentWasteKg={createdResult.expected_food_wastage_kg}
                  onApply={handleApplyRecommendation}
                  isApplying={isApplyingRec}
                />
              </div>
            )}

            {/* Submitted Context Recap */}
            <div className="pt-4 border-t border-[#E2E8F0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                Submitted Meal Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block">Meal Date:</span>
                  <span className="font-medium text-[#1E293B]">{createdResult.date} ({createdResult.day_of_week})</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Meal Type:</span>
                  <span className="font-medium text-[#1E293B]">{createdResult.meal_type}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Special Meal:</span>
                  <span className="font-medium text-[#1E293B]">{createdResult.special_meal}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Weather:</span>
                  <span className="font-medium text-[#1E293B]">{createdResult.weather_condition}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Prediction Timestamp:</span>
                  <span className="font-medium text-[#1E293B]">
                    {new Date(createdResult.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-[#64748B] block">Menu Items:</span>
                  <span className="font-medium text-[#1E293B]">{createdResult.main_menu_items}</span>
                </div>
              </div>
            </div>

            {/* Disclaimers Notice */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md flex items-start gap-2.5 text-xs text-[#64748B]">
              <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                <strong>Operational Note:</strong> Results are machine-learning regression estimates trained on patterned dining labels.
                They are intended to assist batch preparation and portions, not represent measured physical outcomes.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleEditInputs}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#CBD5E1] rounded-md text-sm font-medium text-[#1E293B] bg-white hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB] shadow-sm transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                  <span>Edit Inputs</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#CBD5E1] rounded-md text-sm font-medium text-[#475569] bg-white hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>New Prediction</span>
                </button>
              </div>

              <Link
                to="/predictions/history"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-[#2563EB] shadow-sm transition-colors"
              >
                <span>View in History</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {submissionError && (
            <div
              role="alert"
              className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-3 text-sm text-[#B91C1C]"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Prediction Failed</p>
                <p className="mt-0.5">{submissionError}</p>
                <p className="mt-1 text-xs text-[#7F1D1D]">
                  Your entered inputs have been preserved. You can edit any field and submit again.
                </p>
              </div>
            </div>
          )}

          {/* Shneiderman Rule 7: Next Meal Shortcut Card */}
          <div className="p-4 bg-gradient-to-r from-[#EFF6FF] via-[#EEF2FF] to-[#EFF6FF] border border-[#BFDBFE] rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-[#2563EB] text-white rounded-xl shadow-2xs flex-shrink-0">
                <Zap className="w-5 h-5 fill-white text-white" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#1E293B]">Next Meal Shortcut</span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#DBEAFE] text-[#1D4ED8] rounded-full border border-[#BFDBFE]">
                    {nextMealPreview.label} ({nextMealPreview.time_window})
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  1-Click auto-populates date, meal slot ({nextMealPreview.meal_type}), scheduled menu, and calendar flags.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-fill-next-meal"
              onClick={handleFillNextMeal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#2563EB] flex-shrink-0"
              title={`Fill all input features for ${nextMealPreview.label}`}
            >
              <Zap className="w-4 h-4 fill-white text-white" aria-hidden="true" />
              <span>Fill Next Available Meal ({nextMealPreview.meal_type})</span>
            </button>
          </div>

          {/* Shortcut Applied Feedback & Undo Banner (HCI Golden Rule 3 & 6) */}
          {shortcutFeedback && (
            <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center justify-between text-xs text-[#065F46] shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#059669] flex-shrink-0" aria-hidden="true" />
                <span className="font-semibold">{shortcutFeedback}</span>
              </div>
              {previousValues && (
                <button
                  type="button"
                  onClick={handleUndoShortcut}
                  className="inline-flex items-center gap-1 text-[#047857] hover:text-[#064E3B] font-semibold underline ml-3 flex-shrink-0"
                  aria-label="Undo Shortcut"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo Shortcut</span>
                </button>
              )}
            </div>
          )}

          {/* Group 1: Meal details */}
          <fieldset className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
            <legend className="text-base font-semibold text-[#1E293B] px-1">
              Meal Details
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-[#1E293B]">
                  Date <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  id="date"
                  type="date"
                  aria-invalid={errors.date ? 'true' : 'false'}
                  aria-describedby={errors.date ? 'date-error' : 'derived-day-info'}
                  {...register('date')}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm text-[#1E293B] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                    errors.date ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
                  }`}
                />
                {errors.date ? (
                  <p id="date-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                    {errors.date.message}
                  </p>
                ) : (
                  <p id="derived-day-info" className="mt-1 text-xs text-[#64748B] flex items-center gap-1.5">
                    <span>Day:</span>
                    <strong className="text-[#1E293B]">{derivedDay.name || 'Select date'}</strong>
                    {derivedDay.isWeekend && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-medium">
                        Weekend
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Meal Type */}
              <div>
                <label htmlFor="meal_type" className="block text-sm font-medium text-[#1E293B]">
                  Meal Type <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  id="meal_type"
                  aria-invalid={errors.meal_type ? 'true' : 'false'}
                  aria-describedby={errors.meal_type ? 'meal_type-error' : undefined}
                  {...register('meal_type')}
                  className="mt-1 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#1E293B] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dinner">Dinner</option>
                </select>
                {errors.meal_type && (
                  <p id="meal_type-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                    {errors.meal_type.message}
                  </p>
                )}
              </div>
            </div>

            {/* Special Meal Toggle */}
            <div>
              <span className="block text-sm font-medium text-[#1E293B]">
                Special Meal
              </span>
              <div className="mt-1.5 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#334155]">
                  <input
                    type="radio"
                    value="No"
                    checked={selectedSpecial === 'No'}
                    onChange={() => handleSpecialMealChange('No')}
                    className="text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>No (Regular menu)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#334155]">
                  <input
                    type="radio"
                    value="Yes"
                    checked={selectedSpecial === 'Yes'}
                    onChange={() => handleSpecialMealChange('Yes')}
                    className="text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Yes (Special meal)</span>
                </label>
              </div>
              {selectedSpecial === 'Yes' && (
                <p className="mt-1 text-xs text-[#2563EB]">
                  Menu defaulted to "Special". You can review and edit this or any other fields before submitting.
                </p>
              )}
            </div>

            {/* Menu Items */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="main_menu_items" className="block text-sm font-medium text-[#1E293B]">
                  Menu Items <span className="text-[#B91C1C]">*</span>
                </label>
                {selectedSpecial === 'Yes' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-[#B45309] border border-amber-200">
                    <Sparkles className="w-3 h-3" /> Special feast: auto-assigned as "Special"
                  </span>
                ) : derivedDay.name ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#2563EB] border border-blue-200">
                    <CheckCircle2 className="w-3 h-3" /> Auto-decided for {derivedDay.name} {selectedMeal}
                  </span>
                ) : null}
              </div>

              {menuOptions[selectedMeal] && (
                <div className="mb-2 flex items-center gap-2">
                  <select
                    aria-label="Preset menu options"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setValue('main_menu_items', e.target.value, { shouldValidate: true });
                      }
                    }}
                    className="block w-full text-xs text-[#475569] bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <option value="" disabled>
                      -- Quick switch to alternative {selectedMeal} preset --
                    </option>
                    {menuOptions[selectedMeal].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (derivedDay.name && selectedMeal) {
                        const autoMenu = getAutoDecidedMenu(
                          derivedDay.name,
                          selectedMeal as MealType,
                          selectedSpecial as 'Yes' | 'No'
                        );
                        setValue('main_menu_items', autoMenu, { shouldValidate: true });
                      }
                    }}
                    className="flex-shrink-0 px-2.5 py-1.5 text-xs font-medium text-[#475569] bg-white border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    title="Reset to scheduled menu for this date and meal slot"
                  >
                    Reset to Schedule
                  </button>

                  <button
                    type="button"
                    onClick={handleExploreFormRecs}
                    disabled={isLoadingFormRecs}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded-md hover:bg-[#DBEAFE] focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors disabled:opacity-60"
                    title="Evaluate alternative menus to increase attendance and reduce food wastage"
                  >
                    {isLoadingFormRecs ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                    )}
                    <span>Explore Recommendations</span>
                  </button>
                </div>
              )}


              <textarea
                id="main_menu_items"
                rows={2}
                aria-invalid={errors.main_menu_items ? 'true' : 'false'}
                aria-describedby={errors.main_menu_items ? 'menu-error' : undefined}
                {...register('main_menu_items')}
                className={`block w-full rounded-md border px-3 py-2 text-sm text-[#1E293B] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  errors.main_menu_items ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
                }`}
                placeholder="e.g. Rice, Dal, Chapati, Paneer Curry"
              />
              {errors.main_menu_items && (
                <p id="menu-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                  {errors.main_menu_items.message}
                </p>
              )}

              {/* In-form AI recommendations preview */}
              {formRecs && (
                <div className="mt-3 p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B]">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      <span>Recommended Menu Alternatives for {selectedMeal}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormRecs(null)}
                      className="text-xs text-[#64748B] hover:text-[#1E293B] font-medium underline"
                    >
                      Hide suggestions
                    </button>
                  </div>
                  <MenuRecommendationsCard
                    recommendations={formRecs}
                    onApply={handleSelectFormRec}
                    title="Select a menu to optimize student turnout and reduce wastage:"
                  />
                </div>
              )}
              {formRecsError && (
                <p className="mt-1.5 text-xs text-[#B91C1C]">{formRecsError}</p>
              )}
            </div>
          </fieldset>

          {/* Group 2: Context */}
          <fieldset className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
            <legend className="text-base font-semibold text-[#1E293B] px-1">
              Context
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="weather_condition" className="block text-sm font-medium text-[#1E293B]">
                  Weather Condition
                </label>
                <select
                  id="weather_condition"
                  {...register('weather_condition')}
                  className="mt-1 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#1E293B] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <option value="Clear">Clear</option>
                  <option value="Cloudy">Cloudy</option>
                  <option value="Hot">Hot</option>
                  <option value="Humid">Humid</option>
                  <option value="Rainy">Rainy</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-[#1E293B]">
                  Notes (Optional)
                </label>
                <input
                  id="notes"
                  type="text"
                  maxLength={500}
                  {...register('notes')}
                  className="mt-1 block w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-sm text-[#1E293B] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  placeholder="e.g. Extra salad buffer requested"
                />
              </div>
            </div>

            {/* Checkbox Flags */}
            <div>
              <span className="block text-sm font-medium text-[#1E293B] mb-1">
                Campus Calendar Factors
              </span>
              <p className="text-xs text-[#64748B] mb-2.5">
                Check any conditions applicable to this date. These factors adjust student attendance forecasts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#334155]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('is_holiday')}
                    className="rounded text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                  />
                  <span>Official Holiday</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('exam_on_day')}
                    className="rounded text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                  />
                  <span>Exam Schedule</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('college_event')}
                    className="rounded text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                  />
                  <span>Campus Event / Fest</span>
                </label>
              </div>
            </div>
          </fieldset>

          {/* Group 3: Capacity */}
          <fieldset className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
            <legend className="text-base font-semibold text-[#1E293B] px-1">
              Capacity
            </legend>

            <div>
              <label htmlFor="mess_capacity_students" className="block text-sm font-medium text-[#1E293B]">
                Mess Capacity (Students)
              </label>
              <input
                id="mess_capacity_students"
                type="number"
                min={1}
                max={5000}
                {...register('mess_capacity_students', { valueAsNumber: true })}
                className="mt-1 block w-full max-w-xs rounded-md border border-[#CBD5E1] px-3 py-2 text-sm text-[#1E293B] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              />
              <p className="mt-1 text-xs text-[#64748B]">
                Physical mess seating capacity constraint: default 556 students. Valid range: 1 to 5,000.
              </p>
              {errors.mess_capacity_students && (
                <p role="alert" className="mt-1 text-xs text-[#B91C1C]">
                  {errors.mess_capacity_students.message}
                </p>
              )}
            </div>
          </fieldset>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 border border-[#CBD5E1] rounded-md text-sm font-medium text-[#475569] bg-white hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Calculating Forecast...' : 'Generate Prediction'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
