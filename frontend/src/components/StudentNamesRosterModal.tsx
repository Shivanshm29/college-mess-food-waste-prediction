import React, { useState, useEffect, useMemo } from 'react';
import { intentionsApi } from '../api/intentions';
import { DateMealRosterResponse, IntentionStudentRosterItem } from '../types';
import {
  Users,
  X,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  Calendar,
  Utensils,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface StudentNamesRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  initialMealType?: string;
}

export const StudentNamesRosterModal: React.FC<StudentNamesRosterModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  initialMealType = '',
}) => {
  const [selectedMeal, setSelectedMeal] = useState<string>(initialMealType);
  const [activeTab, setActiveTab] = useState<'all' | 'likely' | 'unlikely' | 'unsure'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rosterData, setRosterData] = useState<DateMealRosterResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setSelectedMeal(initialMealType);
  }, [initialMealType]);

  const fetchRoster = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await intentionsApi.getRoster({
        date: dateStr,
        meal_type: selectedMeal || undefined,
      });
      setRosterData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load student intentions roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoster();
    }
  }, [isOpen, dateStr, selectedMeal]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter students by active tab and search query
  const displayedStudents = useMemo(() => {
    if (!rosterData) return [];

    let list: IntentionStudentRosterItem[] = [];
    if (activeTab === 'likely') {
      list = rosterData.students_likely;
    } else if (activeTab === 'unlikely') {
      list = rosterData.students_unlikely;
    } else if (activeTab === 'unsure') {
      list = rosterData.students_unsure;
    } else {
      list = rosterData.all_students;
    }

    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(
      (s) =>
        s.student_name.toLowerCase().includes(term) ||
        s.student_username.toLowerCase().includes(term) ||
        (s.room_number && s.room_number.toLowerCase().includes(term)) ||
        (s.hostel_block && s.hostel_block.toLowerCase().includes(term))
    );
  }, [rosterData, activeTab, searchTerm]);

  const handleCopyList = () => {
    if (!displayedStudents.length) return;

    const labelMap: Record<string, string> = {
      all: 'All Responded Students',
      likely: 'Attending Students (Yes)',
      unlikely: 'Not Attending Students (No)',
      unsure: 'Unsure Students (Maybe)',
    };

    const header = `Student Intentions Roster - ${dateStr} ${selectedMeal ? `(${selectedMeal})` : '(All Meals)'} - ${labelMap[activeTab]}:\n`;
    const names = displayedStudents
      .map(
        (s, idx) =>
          `${idx + 1}. ${s.student_name} (@${s.student_username}) - ${s.hostel_block || 'Hostel'} Rm ${s.room_number || 'N/A'} [${
            s.intention_status === 'likely' ? 'YES - Attending' : s.intention_status === 'unlikely' ? 'NO - Not Attending' : 'MAYBE - Unsure'
          }]${s.notes ? ` (Note: ${s.notes})` : ''}`
      )
      .join('\n');

    navigator.clipboard.writeText(header + names);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#2563EB] rounded-xl border border-blue-100">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="roster-modal-title" className="text-lg font-bold text-[#1E293B]">
                  Student Intentions Names List
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {dateStr}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Names of students who declared their intention (Yes / No / Maybe) for kitchen preparations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-slate-200/60 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="Close roster dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-[#E2E8F0] bg-white space-y-3">
          {/* Meal Selector Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-lg">
              {(['', 'Breakfast', 'Lunch', 'Dinner'] as const).map((meal) => (
                <button
                  key={meal || 'all-meals'}
                  type="button"
                  onClick={() => setSelectedMeal(meal)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    selectedMeal === meal
                      ? 'bg-white text-[#2563EB] shadow-2xs font-bold'
                      : 'text-[#475569] hover:text-[#1E293B]'
                  }`}
                >
                  {meal || 'All Meals'}
                </button>
              ))}
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyList}
              disabled={!displayedStudents.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#1E293B] transition-colors disabled:opacity-50 shadow-2xs focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Copy Names List</span>
                </>
              )}
            </button>
          </div>

          {/* Status Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Responded ({rosterData?.total_responded ?? 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('likely')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'likely'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yes / Attending ({rosterData?.likely_count ?? 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unlikely')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'unlikely'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>No / Not Attending ({rosterData?.unlikely_count ?? 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unsure')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'unsure'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Maybe / Unsure ({rosterData?.unsure_count ?? 0})</span>
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="relative min-w-[200px] sm:w-64">
              <input
                type="text"
                placeholder="Search student or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Modal Body / Student List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mx-auto" />
              <p className="text-xs text-[#64748B]">Loading student attendance intention roster...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#64748B] space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">
                No students found in this category
              </p>
              <p>
                {searchTerm
                  ? `No students matching "${searchTerm}" found in this view.`
                  : activeTab === 'all'
                  ? 'No meal intentions declared yet for this selection.'
                  : `No students have registered a "${activeTab === 'likely' ? 'Yes' : activeTab === 'unlikely' ? 'No' : 'Maybe'}" intention for this meal.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs">
                <thead className="bg-[#F8FAFC] font-semibold text-[#475569] uppercase tracking-wider text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 w-12 text-center">#</th>
                    <th scope="col" className="px-3 py-2.5">Student Name</th>
                    <th scope="col" className="px-3 py-2.5">Hostel & Room</th>
                    <th scope="col" className="px-3 py-2.5">Meal</th>
                    <th scope="col" className="px-3 py-2.5">Declared Intention</th>
                    <th scope="col" className="px-3 py-2.5">Dietary / Absence Note</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {displayedStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-2.5 text-center text-[#94A3B8] font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#1E293B]">
                        <div>{s.student_name}</div>
                        <span className="text-[11px] text-[#64748B] font-mono font-normal">
                          @{s.student_username}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#475569]">
                        {s.hostel_block || 'Hostel'} &bull; Rm {s.room_number || 'N/A'}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[#1E293B]">{s.meal_type}</td>
                      <td className="px-3 py-2.5">
                        {s.intention_status === 'likely' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Yes (Attending)
                          </span>
                        ) : s.intention_status === 'unlikely' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-700" /> No (Not Attending)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <HelpCircle className="w-3 h-3 text-amber-700" /> Maybe (Unsure)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[#64748B] italic max-w-xs truncate">
                        {s.notes || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#64748B] whitespace-nowrap">
                        {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
          <p>
            Showing <strong>{displayedStudents.length}</strong> student{displayedStudents.length === 1 ? '' : 's'} (of{' '}
            {rosterData?.total_responded ?? 0} total submissions)
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
};
