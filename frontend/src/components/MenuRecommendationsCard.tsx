import React from 'react';
import {
  Sparkles,
  TrendingUp,
  Leaf,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Users,
  Trash2,
  Utensils,
  Lightbulb,
} from 'lucide-react';
import type { MenuRecommendation } from '../types';

interface MenuRecommendationsCardProps {
  recommendations?: MenuRecommendation[];
  isLowTurnout?: boolean;
  currentStudents?: number;
  capacity?: number;
  currentWasteKg?: number;
  onApply?: (rec: MenuRecommendation) => void;
  isApplying?: boolean;
  title?: string;
  className?: string;
}

export const MenuRecommendationsCard: React.FC<MenuRecommendationsCardProps> = ({
  recommendations,
  isLowTurnout,
  currentStudents,
  capacity = 556,
  onApply,
  isApplying = false,
  title,
  className = '',
}) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const turnoutPct =
    currentStudents && capacity
      ? Math.round((currentStudents / capacity) * 100)
      : null;

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'Highest Attendance':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Lowest Wastage':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Attendance Boost':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Best Balance':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'Highest Attendance':
        return <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />;
      case 'Lowest Wastage':
        return <Leaf className="w-3.5 h-3.5" aria-hidden="true" />;
      case 'Attendance Boost':
        return <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />;
      default:
        return <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />;
    }
  };

  return (
    <div
      className={`border rounded-xl p-5 shadow-sm transition-all ${
        isLowTurnout
          ? 'bg-amber-50/60 border-amber-200'
          : 'bg-white border-[#E2E8F0]'
      } ${className}`}
      aria-labelledby="menu-recommendations-title"
    >
      {/* Header section */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`p-2 rounded-lg ${
            isLowTurnout
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-50 text-[#2563EB]'
          }`}
        >
          {isLowTurnout ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          ) : (
            <Lightbulb className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="menu-recommendations-title"
              className="text-base font-bold text-[#1E293B]"
            >
              {title ||
                (isLowTurnout
                  ? 'Low Turnout Detected: Menu Optimization Recommendations'
                  : 'Smart Menu Recommendations')}
            </h3>
            {isLowTurnout && turnoutPct !== null && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                {turnoutPct}% Capacity ({currentStudents} students)
              </span>
            )}
          </div>

          <p className="text-xs text-[#475569] mt-1 leading-relaxed">
            {isLowTurnout
              ? `Expected student attendance is significantly below average. Switching to one of the following high-affinity menus is projected to increase student numbers while optimizing food wastage:`
              : `The machine learning model evaluated alternative menus for this meal slot. Consider these options to maximize student satisfaction and minimize kitchen waste:`}
          </p>
        </div>
      </div>

      {/* Grid of Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3">
        {recommendations.map((rec, index) => {
          const isStudentGain = rec.student_delta > 0;
          const isWasteReduction = rec.wastage_delta_kg < 0;

          return (
            <div
              key={`${rec.menu_items}-${index}`}
              className="bg-white rounded-lg border border-[#CBD5E1] p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div>
                {/* Badge Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
                      rec.strategy_badge
                    )}`}
                  >
                    {getBadgeIcon(rec.strategy_badge)}
                    {rec.strategy_badge}
                  </span>
                  <span className="text-[11px] font-medium text-[#64748B]">
                    Option #{index + 1}
                  </span>
                </div>

                {/* Dish Name */}
                <h4 className="text-sm font-bold text-[#1E293B] leading-snug line-clamp-2">
                  {rec.short_label}
                </h4>
                <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2" title={rec.menu_items}>
                  {rec.menu_items}
                </p>

                {/* Key Metrics Comparison */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
                  {/* Students projection */}
                  <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                      <Users className="w-3 h-3 text-[#2563EB]" aria-hidden="true" />
                      <span>Attendance</span>
                    </div>
                    <div className="text-base font-bold text-[#1E293B] mt-0.5">
                      {rec.projected_students}
                    </div>
                    <div
                      className={`text-[11px] font-semibold mt-0.5 ${
                        isStudentGain ? 'text-[#15803D]' : 'text-[#64748B]'
                      }`}
                    >
                      {rec.student_delta >= 0 ? `+${rec.student_delta}` : `${rec.student_delta}`}{' '}
                      ({rec.student_delta_percentage >= 0 ? `+${rec.student_delta_percentage}%` : `${rec.student_delta_percentage}%`})
                    </div>
                  </div>

                  {/* Wastage projection */}
                  <div className="bg-[#FFFBEB] p-2 rounded border border-[#FDE68A]">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-[#92400E]">
                      <Trash2 className="w-3 h-3 text-[#B45309]" aria-hidden="true" />
                      <span>Wastage</span>
                    </div>
                    <div className="text-base font-bold text-[#B45309] mt-0.5">
                      {rec.projected_food_wastage_kg} <span className="text-xs font-normal">kg</span>
                    </div>
                    <div
                      className={`text-[11px] font-semibold mt-0.5 ${
                        isWasteReduction ? 'text-[#15803D]' : 'text-[#92400E]'
                      }`}
                    >
                      {rec.projected_waste_percentage}% waste{' '}
                      {rec.wastage_delta_kg !== 0 && (
                        <span>
                          ({rec.wastage_delta_kg >= 0 ? `+${rec.wastage_delta_kg}` : `${rec.wastage_delta_kg}`}kg)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Food required */}
                <div className="flex items-center justify-between text-[11px] text-[#475569] mt-2 px-1">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3 h-3 text-[#64748B]" aria-hidden="true" />
                    Food Volume:
                  </span>
                  <span className="font-semibold text-[#1E293B]">{rec.projected_food_required_kg} kg</span>
                </div>

                {/* Explanation text */}
                <div className="mt-2.5 p-2 bg-[#F1F5F9] rounded text-[11px] text-[#334155] leading-relaxed">
                  {rec.reasoning}
                </div>
              </div>

              {/* Action Button */}
              {onApply && (
                <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => onApply(rec)}
                    disabled={isApplying}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:opacity-60"
                  >
                    <span>Apply Menu & Re-Forecast</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
