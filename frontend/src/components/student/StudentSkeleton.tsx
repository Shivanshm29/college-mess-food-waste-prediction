import React from 'react';

export const StudentMealSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-[#E8ECE6] bg-white p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8ECE6]" />
          <div className="space-y-1.5">
            <div className="w-24 h-4 bg-[#E8ECE6] rounded" />
            <div className="w-32 h-3 bg-[#E8ECE6] rounded" />
          </div>
        </div>
        <div className="w-20 h-6 bg-[#E8ECE6] rounded-full" />
      </div>

      <div className="space-y-2">
        <div className="w-28 h-3 bg-[#E8ECE6] rounded" />
        <div className="w-full h-12 bg-[#F1F3F0] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
        <div className="h-10 bg-[#F1F3F0] rounded-lg" />
        <div className="h-10 bg-[#F1F3F0] rounded-lg" />
        <div className="h-10 bg-[#F1F3F0] rounded-lg" />
      </div>
    </div>
  );
};

export const StudentDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome skeleton */}
      <div className="rounded-xl border border-[#E8ECE6] bg-white p-6 space-y-3 animate-pulse">
        <div className="w-48 h-6 bg-[#E8ECE6] rounded" />
        <div className="w-72 h-4 bg-[#F1F3F0] rounded" />
      </div>

      {/* Meals grid skeleton */}
      <div className="space-y-4">
        <div className="w-36 h-5 bg-[#E8ECE6] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StudentMealSkeleton />
          <StudentMealSkeleton />
          <StudentMealSkeleton />
        </div>
      </div>
    </div>
  );
};
