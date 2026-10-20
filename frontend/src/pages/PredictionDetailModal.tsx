import React from 'react';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { MenuRecommendationsCard } from '../components/MenuRecommendationsCard';
import type { PredictionRecord } from '../types';
import { Info } from 'lucide-react';

interface PredictionDetailModalProps {
  prediction: PredictionRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PredictionDetailModal: React.FC<PredictionDetailModalProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  if (!prediction) return null;

  const wastePct =
    prediction.waste_percentage ??
    (prediction.expected_food_required_kg > 0
      ? round2((prediction.expected_food_wastage_kg / prediction.expected_food_required_kg) * 100)
      : 0);

  const foodPerStudent =
    prediction.food_per_student_kg ??
    (prediction.expected_students > 0
      ? round2(prediction.expected_food_required_kg / prediction.expected_students)
      : 0);

  function round2(num: number) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Meal Forecast Details #${prediction.id}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Core Predictions Output Highlights */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            Model Predictions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <span className="text-xs text-[#64748B] block">Expected Headcount</span>
              <span className="text-xl font-bold text-[#1E293B]">
                {prediction.expected_students}
              </span>
              <span className="text-xs text-[#64748B] ml-1">students</span>
              <div className="text-[11px] text-[#94A3B8] mt-1">
                Cap: {prediction.mess_capacity_students} (
                {Math.round((prediction.expected_students / prediction.mess_capacity_students) * 100)}% turnout)
              </div>
            </div>

            <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
              <span className="text-xs text-[#1E40AF] block">Food Required</span>
              <span className="text-xl font-bold text-[#2563EB]">
                {prediction.expected_food_required_kg}
              </span>
              <span className="text-xs text-[#1E40AF] ml-1">kg</span>
              <div className="text-[11px] text-[#2563EB] mt-1">
                ~{foodPerStudent} kg / student
              </div>
            </div>

            <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
              <span className="text-xs text-[#92400E] block">Expected Wastage</span>
              <span className="text-xl font-bold text-[#B45309]">
                {prediction.expected_food_wastage_kg}
              </span>
              <span className="text-xs text-[#92400E] ml-1">kg</span>
              <div className="text-[11px] text-[#B45309] mt-1">
                {wastePct}% estimated waste
              </div>
            </div>
          </div>
        </div>

        {/* Input Parameters Table */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            Submitted Operational Inputs
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-white border border-[#E2E8F0] rounded-lg text-sm">
            <div>
              <dt className="text-xs text-[#64748B]">Date & Day</dt>
              <dd className="font-medium text-[#1E293B]">
                {prediction.date} ({prediction.day_of_week})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Meal Type</dt>
              <dd className="font-medium text-[#1E293B]">
                <Badge variant="info" showIcon={false}>{prediction.meal_type}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Weather</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.weather_condition}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Weekend</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.is_weekend ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Holiday</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.is_holiday ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Exam on Day</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.exam_on_day ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">College Event</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.college_event ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Special Meal Flag</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.special_meal}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B]">Model Version</dt>
              <dd className="font-medium text-[#1E293B]">{prediction.model_version}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#F1F5F9]">
              <dt className="text-xs text-[#64748B]">Main Menu Items</dt>
              <dd className="font-medium text-[#1E293B] mt-0.5">{prediction.main_menu_items}</dd>
            </div>
            {prediction.notes && (
              <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#F1F5F9]">
                <dt className="text-xs text-[#64748B]">Manager Notes</dt>
                <dd className="text-sm text-[#475569] mt-0.5 italic">{prediction.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Menu Recommendations if available */}
        {prediction.menu_recommendations && prediction.menu_recommendations.length > 0 && (
          <div>
            <MenuRecommendationsCard
              recommendations={prediction.menu_recommendations}
              isLowTurnout={prediction.is_low_turnout}
              currentStudents={prediction.expected_students}
              capacity={prediction.mess_capacity_students}
              currentWasteKg={prediction.expected_food_wastage_kg}
              title={
                prediction.is_low_turnout
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
            <strong>Note on Model Estimates:</strong> These figures are generated mathematical forecasts based on
            historical college mess patterns. Real dining outcomes depend on daily student attendance variation,
            weather fluctuations, and actual serving dynamics.
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
