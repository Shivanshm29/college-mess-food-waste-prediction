import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import { MealFeedbackPayload, MealFeedbackRecord, ScheduleResponse } from '../../types/student';
import { LiveAnnouncer } from '../../components/LiveAnnouncer';
import {
  MessageSquareHeart,
  Star,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Utensils,
  History,
  ShieldCheck,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const StudentFeedback: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submit' | 'menu' | 'history'>('submit');
  const [announcement, setAnnouncement] = useState<string>('');

  // Form State
  const [mealDate, setMealDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Lunch');
  const [satisfactionRating, setSatisfactionRating] = useState<number>(4);
  const [tasteRating, setTasteRating] = useState<number>(4);
  const [portionSize, setPortionSize] = useState<'Too small' | 'Just right' | 'Too large'>('Just right');
  const [comments, setComments] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // History & Menu Data
  const [feedbackHistory, setFeedbackHistory] = useState<MealFeedbackRecord[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<ScheduleResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'menu' && !weeklySchedule) {
      loadWeeklyMenu();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await studentApi.getFeedbacks();
      setFeedbackHistory(res);
    } catch (err: any) {
      setAnnouncement('Could not load past feedback.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadWeeklyMenu = async () => {
    try {
      const res = await studentApi.getSchedule({ days: 7 });
      setWeeklySchedule(res);
    } catch (err: any) {
      // Menu fetch failure handled gracefully
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);
      setSubmitSuccess(false);

      const payload: MealFeedbackPayload = {
        date: mealDate,
        meal_type: mealType,
        satisfaction_rating: satisfactionRating,
        taste_rating: tasteRating,
        portion_size_rating: portionSize,
        comments: comments.trim() ? comments.trim() : null,
        is_anonymous: isAnonymous,
      };

      await studentApi.submitFeedback(payload);
      setSubmitSuccess(true);
      setAnnouncement('Feedback submitted successfully. Thank you for helping improve mess meals!');
      setComments('');

      // Refresh history if already loaded
      if (feedbackHistory.length > 0) {
        loadHistory();
      }
    } catch (err: any) {
      setFormError(err.message || 'We could not submit your feedback. Please check your connection and try again.');
      setAnnouncement('Error submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <LiveAnnouncer message={announcement} />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D1B] tracking-tight">
          Menu & Meal Quality Feedback
        </h1>
        <p className="text-xs sm:text-sm text-[#68746C] mt-0.5">
          Share your dining experience or view the published weekly hostel menu.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#F1F3F0] rounded-lg border border-[#E2E6DF] w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveTab('submit');
            setSubmitSuccess(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'submit'
              ? 'bg-white text-[#1B4332] shadow-2xs'
              : 'text-[#68746C] hover:text-[#1A1D1B]'
          }`}
        >
          <MessageSquareHeart className="w-3.5 h-3.5" />
          <span>Leave Feedback</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'menu'
              ? 'bg-white text-[#1B4332] shadow-2xs'
              : 'text-[#68746C] hover:text-[#1A1D1B]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Weekly Menu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'history'
              ? 'bg-white text-[#1B4332] shadow-2xs'
              : 'text-[#68746C] hover:text-[#1A1D1B]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>My Submissions</span>
        </button>
      </div>

      {/* Tab 1: Submit Feedback */}
      {activeTab === 'submit' && (
        <div className="max-w-2xl bg-white border border-[#E8ECE6] rounded-xl p-6 shadow-2xs space-y-6">
          {submitSuccess && (
            <div
              role="alert"
              className="p-4 bg-[#EBF7EE] border border-[#B7E4C7] rounded-lg flex items-start gap-3 text-xs text-[#1B4332]"
            >
              <CheckCircle2 className="w-5 h-5 text-[#2D6A4F] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Thank you for your feedback!</p>
                <p className="mt-0.5 text-[#2D6A4F]">
                  Your responses are aggregated by mess administration to evaluate menu quality and serving consistency.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-2 text-xs underline font-semibold text-[#1B4332]"
                >
                  Submit another response
                </button>
              </div>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="p-3.5 bg-[#FBEBE8] border border-[#F5C2B6] rounded-lg flex items-center gap-2.5 text-xs text-[#9C4221]"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitFeedback} className="space-y-5">
            {/* Meal Date & Type Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="feedback-date" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                  Meal Date
                </label>
                <input
                  type="date"
                  id="feedback-date"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
                />
              </div>

              <div>
                <label htmlFor="feedback-meal" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                  Meal Session
                </label>
                <select
                  id="feedback-meal"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as any)}
                  className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>
            </div>

            {/* Satisfaction Rating */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1A1D1B]">
                Overall Satisfaction ({satisfactionRating} / 5)
              </label>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Satisfaction rating from 1 to 5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={satisfactionRating === star}
                    onClick={() => setSatisfactionRating(star)}
                    className={`p-2 rounded-lg border transition-all ${
                      satisfactionRating >= star
                        ? 'bg-[#EBF7EE] border-[#B7E4C7] text-[#1B4332]'
                        : 'bg-[#FAFBF9] border-[#E8ECE6] text-[#8A968E] hover:border-[#CCD5CA]'
                    }`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        satisfactionRating >= star ? 'fill-[#2D6A4F] text-[#2D6A4F]' : 'text-[#8A968E]'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-[#68746C] ml-2">
                  {satisfactionRating === 1 && 'Poor'}
                  {satisfactionRating === 2 && 'Fair'}
                  {satisfactionRating === 3 && 'Good'}
                  {satisfactionRating === 4 && 'Very Good'}
                  {satisfactionRating === 5 && 'Excellent'}
                </span>
              </div>
            </div>

            {/* Taste Rating */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1A1D1B]">
                Taste & Preparation Quality ({tasteRating} / 5)
              </label>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Taste rating from 1 to 5">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    role="radio"
                    aria-checked={tasteRating === num}
                    onClick={() => setTasteRating(num)}
                    className={`w-10 h-10 rounded-lg border text-xs font-bold transition-all ${
                      tasteRating === num
                        ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-2xs'
                        : 'bg-[#FAFBF9] border-[#E8ECE6] text-[#4C554F] hover:border-[#CCD5CA]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Portion Size */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1A1D1B]">
                Portion Size
              </label>
              <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Portion size evaluation">
                {(['Too small', 'Just right', 'Too large'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={portionSize === opt}
                    onClick={() => setPortionSize(opt)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                      portionSize === opt
                        ? 'bg-[#EBF7EE] border-[#2D6A4F] text-[#1B4332] font-semibold ring-1 ring-[#2D6A4F]'
                        : 'bg-[#FAFBF9] border-[#E8ECE6] text-[#4C554F] hover:border-[#CCD5CA]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-1">
              <label htmlFor="feedback-comments" className="block text-xs font-semibold text-[#1A1D1B]">
                Comments or Suggestions (Optional)
              </label>
              <textarea
                id="feedback-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What did you enjoy? What could the mess improve for this meal?"
                className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg p-3 text-[#1A1D1B] placeholder-[#8A968E] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none resize-none"
              />
              <div className="text-right text-[11px] text-[#8A968E]">
                {comments.length} / 500 characters
              </div>
            </div>

            {/* Anonymity Checkbox */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="anonymous-toggle"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-[#CCD5CA] text-[#2D6A4F] focus:ring-[#2D6A4F] cursor-pointer"
              />
              <label htmlFor="anonymous-toggle" className="text-xs text-[#4C554F] cursor-pointer flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Submit anonymously (hides your name & student ID from mess staff)</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Meal Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Weekly Menu */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="bg-[#FAFBF9] border border-[#E8ECE6] rounded-xl p-4 text-xs text-[#4C554F]">
            This is the official menu published by mess management. Ingredients are sourced in accordance with demand forecasts.
          </div>

          {!weeklySchedule ? (
            <div className="text-center py-8 text-xs text-[#8A968E]">Loading weekly schedule...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklySchedule.days.map((d) => (
                <div key={d.date} className="bg-white border border-[#E8ECE6] rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F0]">
                    <span className="text-xs font-bold text-[#1A1D1B]">
                      {d.day_name}, {d.date}
                    </span>
                    {d.is_today && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#2D6A4F] text-white rounded">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {d.meals.map((m) => (
                      <div key={m.meal_type} className="text-xs space-y-0.5">
                        <span className="font-semibold text-[#2D6A4F]">{m.meal_type}: </span>
                        <span className="text-[#4C554F]">{m.menu_items || 'Regular menu'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="text-center py-8 text-xs text-[#8A968E]">Loading your feedback history...</div>
          ) : feedbackHistory.length === 0 ? (
            <div className="bg-white border border-[#E8ECE6] rounded-xl p-8 text-center space-y-2">
              <MessageSquareHeart className="w-8 h-8 text-[#CCD5CA] mx-auto" />
              <h2 className="text-sm font-bold text-[#1A1D1B]">No Feedback Submitted Yet</h2>
              <p className="text-xs text-[#68746C]">
                Your past reviews will appear here once you share feedback on mess meals.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackHistory.map((item) => (
                <div key={item.id} className="bg-white border border-[#E8ECE6] rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1D1B]">{item.meal_type}</span>
                      <span className="text-xs text-[#68746C]">&bull; {item.date}</span>
                    </div>
                    <span className="text-[11px] text-[#8A968E]">
                      {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 font-medium text-[#1A1D1B]">
                      <Star className="w-3.5 h-3.5 fill-[#2D6A4F] text-[#2D6A4F]" />
                      Satisfaction: {item.satisfaction_rating}/5
                    </span>
                    <span className="text-[#68746C]">Taste: {item.taste_rating}/5</span>
                    <span className="text-[#68746C]">Portion: {item.portion_size_rating}</span>
                  </div>

                  {item.comments && (
                    <p className="text-xs text-[#4C554F] bg-[#FAFBF9] p-2.5 rounded border border-[#F1F3F0] italic">
                      "{item.comments}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
