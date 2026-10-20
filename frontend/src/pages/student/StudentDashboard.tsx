import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../api/student';
import { StudentDashboardData, IntentionChoice } from '../../types/student';
import { StudentMealPanel } from '../../components/student/StudentMealPanel';
import { StudentDashboardSkeleton } from '../../components/student/StudentSkeleton';
import { StudentBadge } from '../../components/student/StudentBadge';
import { LiveAnnouncer } from '../../components/LiveAnnouncer';
import {
  CalendarDays,
  Sparkles,
  ArrowRight,
  Bell,
  Clock,
  History,
  MessageSquareHeart,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [submittingMeal, setSubmittingMeal] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setError(null);
      const res = await studentApi.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Unable to load today’s meals. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSaveIntention = async (mealType: string, choice: IntentionChoice) => {
    if (!data) return;
    try {
      setSubmittingMeal(mealType);
      setAnnouncement(`Saving your ${choice} intention for ${mealType}...`);

      await studentApi.saveIntention({
        date: data.today_date,
        meal_type: mealType as any,
        status: choice,
      });

      setAnnouncement(`Successfully recorded: ${choice} to attend ${mealType}.`);
      await loadDashboard();
    } catch (err: any) {
      setAnnouncement(`Failed to save intention: ${err.message}`);
      throw err;
    } finally {
      setSubmittingMeal(null);
    }
  };

  const handleWithdrawIntention = async (intentionId: number) => {
    try {
      setAnnouncement('Withdrawing intention...');
      await studentApi.withdrawIntention(intentionId);
      setAnnouncement('Meal intention withdrawn.');
      await loadDashboard();
    } catch (err: any) {
      setAnnouncement(`Failed to withdraw: ${err.message}`);
      throw err;
    }
  };

  const scrollToMeals = () => {
    const el = document.getElementById('todays-meals');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return <StudentDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl max-w-lg mx-auto my-12 shadow-sm">
        <AlertCircle className="w-10 h-10 text-[#9C4221] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1A1D1B]">Unable to Load Student Dashboard</h2>
        <p className="text-xs text-[#68746C] mt-1">{error || 'Please try refreshing the page.'}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            loadDashboard();
          }}
          className="mt-4 px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-md hover:bg-[#2D6A4F] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <LiveAnnouncer message={announcement} />

      {/* Welcome Banner */}
      <section
        aria-labelledby="welcome-heading"
        className="bg-white rounded-xl border border-[#E8ECE6] p-5 sm:p-6 shadow-2xs relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 id="welcome-heading" className="text-xl sm:text-2xl font-bold text-[#1A1D1B] tracking-tight">
              {getGreeting()}, {data.student_name}!
            </h2>
            <p className="text-xs sm:text-sm text-[#4C554F]">
              Today is <strong className="text-[#242926]">{data.today_day_name}, {data.today_date}</strong>.
              {data.pending_responses_count > 0 ? (
                <span className="text-[#2D6A4F] font-semibold ml-1">
                  You have {data.pending_responses_count} meal {data.pending_responses_count === 1 ? 'response' : 'responses'} pending today.
                </span>
              ) : (
                <span className="text-[#2D6A4F] font-semibold ml-1">
                  All meal responses for today have been submitted. Thank you!
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={scrollToMeals}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
            >
              <span>Plan Today's Meals</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Section: Today's Meals */}
      <section id="todays-meals" aria-labelledby="today-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="today-heading" className="text-lg font-bold text-[#1A1D1B] tracking-tight">
              Today's Meals & Attendance Intentions
            </h2>
            <p className="text-xs text-[#68746C] mt-0.5">
              Confirm whether you plan to eat at the mess. Your response helps the kitchen prepare the right volume and avoid food waste.
            </p>
          </div>

          <Link
            to="/student/schedule"
            className="text-xs font-semibold text-[#2D6A4F] hover:text-[#1B4332] inline-flex items-center gap-1 group"
          >
            <span>View Full Schedule</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* 3 Meal Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {data.today_meals.map((meal) => (
            <StudentMealPanel
              key={meal.meal_type}
              meal={meal}
              dateStr={data.today_date}
              onSaveIntention={handleSaveIntention}
              onWithdrawIntention={handleWithdrawIntention}
              isSubmitting={submittingMeal === meal.meal_type}
            />
          ))}
        </div>
      </section>

      {/* Secondary Content: Two Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left Column (2 cols): Upcoming Meals preview */}
        <div className="lg:col-span-2 space-y-6">
          <section aria-labelledby="upcoming-heading" className="bg-white border border-[#E8ECE6] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F0]">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
                <h3 id="upcoming-heading" className="text-sm font-bold text-[#1A1D1B]">
                  Upcoming Meals (Next 48 Hours)
                </h3>
              </div>
              <Link
                to="/student/schedule"
                className="text-xs font-medium text-[#2D6A4F] hover:underline"
              >
                Full week &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {data.upcoming_meals.map((up, idx) => (
                <div
                  key={`${up.date}-${up.meal_type}-${idx}`}
                  className="p-3.5 bg-[#FAFBF9] border border-[#E8ECE6] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F4F6F2] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1D1B]">
                        {up.day_name}, {up.date}
                      </span>
                      <span className="text-[11px] font-medium text-[#2D6A4F] bg-[#EBF7EE] px-2 py-0.2 rounded border border-[#D8F3DC]">
                        {up.meal_type}
                      </span>
                      <span className="text-[11px] text-[#68746C] hidden sm:inline">
                        ({up.time_window})
                      </span>
                    </div>
                    <p className="text-xs text-[#4C554F] line-clamp-1">
                      {up.menu_items || 'Regular hostel menu'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center">
                    {up.intention_status ? (
                      <StudentBadge status={up.intention_status} size="sm" />
                    ) : (
                      <span className="text-[11px] text-[#8A968E] italic">No intention set</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Intention Activity */}
          <section aria-labelledby="activity-heading" className="bg-white border border-[#E8ECE6] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F0]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
                <h3 id="activity-heading" className="text-sm font-bold text-[#1A1D1B]">
                  Recent Intention Activity
                </h3>
              </div>
              <Link to="/student/plans" className="text-xs font-medium text-[#2D6A4F] hover:underline">
                View all plans &rarr;
              </Link>
            </div>

            {data.recent_intentions.length === 0 ? (
              <p className="text-xs text-[#8A968E] text-center py-4">No recent intention activity yet.</p>
            ) : (
              <div className="divide-y divide-[#F1F3F0]">
                {data.recent_intentions.slice(0, 4).map((rec) => (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#1A1D1B]">
                        {rec.meal_type} on {rec.date}
                      </span>
                      <span className="text-[11px] text-[#8A968E] ml-2">
                        Updated {new Date(rec.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <StudentBadge status={rec.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (1 col): Announcements & Quick Feedback */}
        <div className="space-y-6">
          {/* Mess Announcements */}
          <section aria-labelledby="announcements-heading" className="bg-white border border-[#E8ECE6] rounded-xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F0]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
                <h3 id="announcements-heading" className="text-sm font-bold text-[#1A1D1B]">
                  Mess Notices
                </h3>
              </div>
              <Link to="/student/notifications" className="text-xs font-medium text-[#2D6A4F] hover:underline">
                All notices &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {data.announcements.map((notif) => (
                <div key={notif.id} className="p-3 bg-[#FAFBF9] border border-[#E8ECE6] rounded-lg space-y-1">
                  <h4 className="text-xs font-bold text-[#1A1D1B]">{notif.title}</h4>
                  <p className="text-xs text-[#4C554F] leading-relaxed line-clamp-2">{notif.message}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Feedback Shortcut Card */}
          <section aria-labelledby="feedback-card-heading" className="bg-[#EBF7EE] border border-[#B7E4C7] rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#D8F3DC] text-[#1B4332]">
                <MessageSquareHeart className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="feedback-card-heading" className="text-sm font-bold text-[#1B4332]">
                  How Was Your Recent Meal?
                </h3>
                <p className="text-xs text-[#2D6A4F] mt-1 leading-relaxed">
                  Help our kitchen staff improve taste, portion size, and overall satisfaction.
                </p>
              </div>
            </div>

            <Link
              to="/student/feedback"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-medium rounded-md shadow-2xs transition-colors"
            >
              <span>Leave Quick Feedback</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
};
