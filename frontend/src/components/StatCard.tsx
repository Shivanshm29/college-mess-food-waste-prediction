import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'success';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  variant = 'default',
}) => {
  const getBorderColor = () => {
    switch (variant) {
      case 'primary':
        return 'border-l-4 border-l-[#2563EB]';
      case 'warning':
        return 'border-l-4 border-l-[#B45309]';
      case 'success':
        return 'border-l-4 border-l-[#15803D]';
      default:
        return 'border-l-4 border-l-[#E2E8F0]';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-sm ${getBorderColor()} flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
          {label}
        </span>
        {icon && <div className="text-[#64748B] p-1.5 bg-[#F8FAFC] rounded-md">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-[#1E293B]">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[#64748B]">
            {unit}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-[#64748B] border-t border-[#F1F5F9] pt-2">
          {subtext}
        </p>
      )}
    </div>
  );
};
