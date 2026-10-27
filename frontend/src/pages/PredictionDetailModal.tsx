import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { MenuRecommendationsCard } from '../components/MenuRecommendationsCard';
import { predictionsApi } from '../api/predictions';
import { validateAttendance, validateFoodQuantity } from '../utils/validation';
import type { PredictionRecord } from '../types';
import {
  Info,
  Sparkles,
  Users,
  Utensils,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit2,
  Loader2,
} from 'lucide-react';

interface PredictionDetailModalProps {
  prediction: PredictionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onActualsUpdated?: (updated: PredictionRecord) => void;
}

export const PredictionDetailModal: React.FC<PredictionDetailModalProps> = ({
  prediction,
  isOpen,
  onClose,
  onActualsUpdated,
}) => {
  const [isEditingActuals, setIsEditingActuals] = useState(false);
  const [actualAttendanceInput, setActualAttendanceInput] = useState('');
  const [actualFoodPreparedInput, setActualFoodPreparedInput] = useState('');
  const [actualFoodWastedInput, setActualFoodWastedInput] = useState('');
  const [actualsFormError, setActualsFormError] = useState<string | null>(null);
  const [isSubmittingActuals, setIsSubmittingActuals] = useState(false);
  const [actualsSuccessMessage, setActualsSuccessMessage] = useState<string | null>(null);
  const [currentRecord, setCurrentRecord] = useState<PredictionRecord | null>(prediction);

  // Synchronize when prediction changes
  React.useEffect(() => {
    setCurrentRecord(prediction);
    if (prediction) {
      setActualAttendanceInput(prediction.actual_attendance !== null && prediction.actual_attendance !== undefined ? String(prediction.actual_attendance) : '');
      setActualFoodPreparedInput(prediction.actual_food_prepared_kg !== null && prediction.actual_food_prepared_kg !== undefined ? String(prediction.actual_food_prepared_kg) : '');
      setActualFoodWastedInput(prediction.actual_food_wasted_kg !== null && prediction.actual_food_wasted_kg !== undefined ? String(prediction.actual_food_wasted_kg) : '');
      setIsEditingActuals(false);
      setActualsFormError(null);
      setActualsSuccessMessage(null);
    }
  }, [prediction]);

  if (!currentRecord) return null;

  const record = currentRecord;

  const wastePct =
    record.waste_percentage ??
    (record.expected_food_required_kg > 0
      ? Math.round(((record.expected_food_wastage_kg / record.expected_food_required_kg) * 100) * 100) / 100
      : 0);

  const foodPerStudent =
    record.food_per_student_kg ??
    (record.expected_students > 0
      ? Math.round((record.expected_food_required_kg / record.expected_students) * 100) / 100
      : 0);

  const handleStartRecording = () => {
    setIsEditingActuals(true);
    setActualsFormError(null);
    setActualsSuccessMessage(null);
  };

  const handleCancelRecording = () => {
    setIsEditingActuals(false);
    setActualsFormError(null);
    setActualAttendanceInput(record.actual_attendance !== null && record.actual_attendance !== undefined ? String(record.actual_attendance) : '');
    setActualFoodPreparedInput(record.actual_food_prepared_kg !== null && record.actual_food_prepared_kg !== undefined ? String(record.actual_food_prepared_kg) : '');
    setActualFoodWastedInput(record.actual_food_wasted_kg !== null && record.actual_food_wasted_kg !== undefined ? String(record.actual_food_wasted_kg) : '');
  };

  const handleSaveActuals = async (e: React.FormEvent) => {
    e.preventDefault();
    setActualsFormError(null);

    // Validate Actual Attendance
    const attResult = validateAttendance(actualAttendanceInput, record.mess_capacity_students, 'Actual Attendance');
    if (!attResult.isValid || attResult.value === undefined) {
      setActualsFormError(attResult.error || 'Invalid actual attendance.');
      return;
    }

    // Validate Food Prepared
    const prepResult = validateFoodQuantity(actualFoodPreparedInput, 'Actual Food Prepared (kg)');
    if (!prepResult.isValid || prepResult.value === undefined) {
      setActualsFormError(prepResult.error || 'Invalid food prepared quantity.');
      return;
    }

    // Validate Food Wasted
    const wasteResult = validateFoodQuantity(actualFoodWastedInput, 'Actual Food Wasted (kg)');
    if (!wasteResult.isValid || wasteResult.value === undefined) {
      setActualsFormError(wasteResult.error || 'Invalid food wasted quantity.');
      return;
    }

    try {
      setIsSubmittingActuals(true);
      const updated = await predictionsApi.recordActuals(record.id, {
        actual_attendance: attResult.value,
        actual_food_prepared_kg: prepResult.value,
        actual_food_wasted_kg: wasteResult.value,
      });

      setCurrentRecord(updated);
      setIsEditingActuals(false);
      setActualsSuccessMessage('Actual outcome recorded successfully.');
      if (onActualsUpdated) {
        onActualsUpdated(updated);
      }
      setTimeout(() => setActualsSuccessMessage(null), 4000);
    } catch (err: any) {
      setActualsFormError(err.message || 'Unable to save actual outcomes. Please verify inputs and try again.');
    } finally {
      setIsSubmittingActuals(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Meal Forecast Details #${record.id}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Special Meal Operational Rule Banner */}
        {record.special_meal === 'Yes' && (
          <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#B45309]">Special Meal Operational Guideline</p>
              <p className="mt-0.5 text-[#78350F] leading-relaxed">
                Target Attendance: <strong>{record.special_meal_target ?? 523} students</strong> (94% minimum capacity rule).
                The ML model forecast of <strong>{record.expected_students} students</strong> is generated independently from training features.
              </p>
            </div>
          </div>
        )}

        {/* Student Attendance Intentions Banner (Decision-Support) */}
        {record.intentions_total_submitted && record.intentions_total_submitted > 0 ? (
          <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs text-[#065F46] flex items-start gap-2.5">
            <Users className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[#047857]">Advance Student Attendance Intentions</p>
              <p className="mt-0.5 text-[#065F46] leading-relaxed">
                <strong>{record.intentions_likely_count}</strong> students indicated likely to attend,{' '}
                <strong>{record.intentions_unlikely_count}</strong> not attending ({record.intentions_total_submitted} total submitted responses).
                These voluntary intentions guide kitchen batch preparation while the ML forecast provides statistical modeling.
              </p>
            </div>
          </div>
        ) : null}

        {/* Model Forecasts (Clearly Labeled) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Expected Forecast (Model Predictions)
            </h3>
            <span className="text-xs text-[#64748B]">Unit: Kilograms (kg) & Headcount</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#F8FAFC] border-l-4 border-l-[#2563EB] border border-[#E2E8F0] rounded-lg">
              <span className="text-xs text-[#64748B] block font-medium">Expected Students</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1E293B]">
                  {record.expected_students}
                </span>
                <span className="text-xs text-[#64748B]">students</span>
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-1">
                Capacity: {record.mess_capacity_students} ({Math.round((record.expected_students / record.mess_capacity_students) * 100)}% turnout)
              </div>
            </div>

            <div className="p-3.5 bg-[#EFF6FF] border-l-4 border-l-[#1E40AF] border border-[#BFDBFE] rounded-lg">
              <span className="text-xs text-[#1E40AF] block font-medium">Expected Food Required (kg)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#2563EB]">
                  {record.expected_food_required_kg}
                </span>
                <span className="text-xs text-[#1E40AF]">kg</span>
              </div>
              <div className="text-[11px] text-[#2563EB] mt-1">
                ~{foodPerStudent} kg / student
              </div>
            </div>

            <div className="p-3.5 bg-[#FFFBEB] border-l-4 border-l-[#B45309] border border-[#FDE68A] rounded-lg">
              <span className="text-xs text-[#92400E] block font-medium">Expected Food Wastage (kg)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#B45309]">
                  {record.expected_food_wastage_kg}
                </span>
                <span className="text-xs text-[#92400E]">kg</span>
              </div>
              <div className="text-[11px] text-[#B45309] mt-1">
                {wastePct}% estimated waste
              </div>
            </div>
          </div>
        </div>

        {/* Post-Meal Actual Outcomes & Variance Tracking */}
        <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E293B]">
                Actual Recorded Outcomes & Differences
              </h3>
              <p className="text-xs text-[#64748B]">
                Physical post-meal measurements clearly distinguished from model estimates.
              </p>
            </div>

            {!isEditingActuals && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#2563EB] text-xs font-medium rounded hover:bg-[#EFF6FF] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                {record.has_actuals ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Update Actuals</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Record Actuals</span>
                  </>
                )}
              </button>
            )}
          </div>

          {actualsSuccessMessage && (
            <div role="status" className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-xs rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{actualsSuccessMessage}</span>
            </div>
          )}

          {actualsFormError && (
            <div role="alert" className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actualsFormError}</span>
            </div>
          )}

          {isEditingActuals ? (
            /* Editing / Entry Form */
            <form onSubmit={handleSaveActuals} className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="modal-actual-attendance" className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Actual Attendance (Students)
                  </label>
                  <input
                    id="modal-actual-attendance"
                    type="number"
                    step="1"
                    min="0"
                    max={record.mess_capacity_students}
                    value={actualAttendanceInput}
                    onChange={(e) => setActualAttendanceInput(e.target.value)}
                    placeholder="e.g. 480"
                    required
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded bg-white text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                  <span className="text-[10px] text-[#64748B] mt-0.5 block">0 to {record.mess_capacity_students} whole students</span>
                </div>

                <div>
                  <label htmlFor="modal-actual-food-prep" className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Actual Food Prepared (kg)
                  </label>
                  <input
                    id="modal-actual-food-prep"
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualFoodPreparedInput}
                    onChange={(e) => setActualFoodPreparedInput(e.target.value)}
                    placeholder="e.g. 135.5"
                    required
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded bg-white text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                  <span className="text-[10px] text-[#64748B] mt-0.5 block">Total batch volume in kg</span>
                </div>

                <div>
                  <label htmlFor="modal-actual-food-waste" className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Actual Food Wasted (kg)
                  </label>
                  <input
                    id="modal-actual-food-waste"
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualFoodWastedInput}
                    onChange={(e) => setActualFoodWastedInput(e.target.value)}
                    placeholder="e.g. 5.2"
                    required
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded bg-white text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  />
                  <span className="text-[10px] text-[#64748B] mt-0.5 block">Unconsumed leftovers in kg</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  disabled={isSubmittingActuals}
                  className="px-3 py-1.5 text-xs text-[#475569] bg-white border border-[#CBD5E1] rounded hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingActuals}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded flex items-center gap-1.5"
                >
                  {isSubmittingActuals && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Actuals</span>
                </button>
              </div>
            </form>
          ) : record.has_actuals ? (
            /* Display Recorded Actuals with Difference / Variance */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E2E8F0]">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-xs text-[#64748B] block">Actual Attendance</span>
                <span className="text-lg font-bold text-[#1E293B]">{record.actual_attendance} students</span>
                <div className="text-xs mt-1">
                  Difference:{' '}
                  <strong className={record.attendance_difference !== null && record.attendance_difference !== undefined && record.attendance_difference >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                    {record.attendance_difference !== null && record.attendance_difference !== undefined && record.attendance_difference >= 0 ? `+${record.attendance_difference}` : record.attendance_difference} students
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-xs text-[#64748B] block">Actual Food Prepared (kg)</span>
                <span className="text-lg font-bold text-[#1E293B]">{record.actual_food_prepared_kg} kg</span>
                <div className="text-xs mt-1">
                  Difference:{' '}
                  <strong className={record.food_difference_kg !== null && record.food_difference_kg !== undefined && record.food_difference_kg <= 0 ? 'text-[#15803D]' : 'text-[#B45309]'}>
                    {record.food_difference_kg !== null && record.food_difference_kg !== undefined && record.food_difference_kg >= 0 ? `+${record.food_difference_kg}` : record.food_difference_kg} kg
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-xs text-[#64748B] block">Actual Food Wasted (kg)</span>
                <span className="text-lg font-bold text-[#1E293B]">{record.actual_food_wasted_kg} kg</span>
                <div className="text-xs mt-1">
                  Difference:{' '}
                  <strong className={record.waste_difference_kg !== null && record.waste_difference_kg !== undefined && record.waste_difference_kg <= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                    {record.waste_difference_kg !== null && record.waste_difference_kg !== undefined && record.waste_difference_kg >= 0 ? `+${record.waste_difference_kg}` : record.waste_difference_kg} kg
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            /* No actuals recorded state */
            <div className="text-xs text-[#64748B] py-2">
              <span className="font-semibold text-[#334155]">Status:</span> Forecast only. No actual post-meal outcome has been recorded yet for this meal slot.
            </div>
          )}
        </div>

        {/* Input Parameters Table */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            Submitted Operational Inputs
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-white border border-[#E2E8F0] rounded-lg text-sm">
            <div>
              <dt className="text-xs text-[#64748B]">Meal Date</dt>
              <dd className="font-medium text-[#1E293B]">
                {record.date} ({record.day_of_week})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Meal Type</dt>
              <dd className="font-medium text-[#1E293B]">
                <Badge variant="info" showIcon={false}>{record.meal_type}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Weather</dt>
              <dd className="font-medium text-[#1E293B]">{record.weather_condition}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Weekend</dt>
              <dd className="font-medium text-[#1E293B]">{record.is_weekend ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Holiday</dt>
              <dd className="font-medium text-[#1E293B]">{record.is_holiday ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Exam on Day</dt>
              <dd className="font-medium text-[#1E293B]">{record.exam_on_day ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">College Event</dt>
              <dd className="font-medium text-[#1E293B]">{record.college_event ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Special Meal Flag</dt>
              <dd className="font-medium text-[#1E293B]">{record.special_meal}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Prediction Timestamp</dt>
              <dd className="font-medium text-[#1E293B]">
                {new Date(record.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#F1F5F9]">
              <dt className="text-xs text-[#64748B]">Main Menu Items</dt>
              <dd className="font-medium text-[#1E293B] mt-0.5">{record.main_menu_items}</dd>
            </div>
            {record.notes && (
              <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#F1F5F9]">
                <dt className="text-xs text-[#64748B]">Manager Notes</dt>
                <dd className="text-sm text-[#475569] mt-0.5 italic">{record.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Menu Recommendations if available */}
        {record.menu_recommendations && record.menu_recommendations.length > 0 && (
          <div>
            <MenuRecommendationsCard
              recommendations={record.menu_recommendations}
              isLowTurnout={record.is_low_turnout}
              currentStudents={record.expected_students}
              capacity={record.mess_capacity_students}
              currentWasteKg={record.expected_food_wastage_kg}
              title={
                record.is_low_turnout
                  ? 'Alternative Menus to Counter Low Expected Turnout'
                  : 'Menu Optimization Alternatives'
              }
            />
          </div>
        )}

        {/* Disclaimer / Model limitation */}
        <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md flex items-start gap-2.5 text-xs text-[#64748B]">
          <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Decision Support Disclaimer:</strong> Predicted figures are machine-learning statistical estimates
            intended to support food preparation planning. Actual kitchen batch sizes remain at the manager's discretion,
            as dining turnout and consumption may vary due to unplanned student activities.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#475569] text-sm font-medium rounded-md hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
