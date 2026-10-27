import React, { useEffect, useState } from 'react';
import { intentionsApi } from '../api/intentions';
import { DateIntentionsSummary, PaginatedManagerIntentions } from '../types';
import { StatCard } from '../components/StatCard';
import {
  Users,
  Calendar,
  Utensils,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  AlertCircle,
  Table as TableIcon,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { StudentNamesRosterModal } from '../components/StudentNamesRosterModal';

export const ManagerIntentions: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Aggregated Summary State
  const [summary, setSummary] = useState<DateIntentionsSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Paginated Individual Intentions Table State
  const [intentionsData, setIntentionsData] = useState<PaginatedManagerIntentions | null>(null);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Student Names Roster Modal State
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterModalMeal, setRosterModalMeal] = useState<string>('');

  // Filters
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showAccessibleChartTable, setShowAccessibleChartTable] = useState<boolean>(false);

  const fetchSummary = async (dateVal: string) => {
    try {
      setIsSummaryLoading(true);
      setSummaryError(null);
      const res = await intentionsApi.getSummary(dateVal);
      setSummary(res);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to load meal intentions summary.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const fetchList = async (dateVal: string, pageNum: number) => {
    try {
      setIsTableLoading(true);
      setTableError(null);
      const res = await intentionsApi.getIntentions({
        date: dateVal,
        meal_type: selectedMeal || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
        page: pageNum,
        page_size: 15,
      });
      setIntentionsData(res);
    } catch (err: any) {
      setTableError(err.message || 'Failed to load individual intentions list.');
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedDate);
    fetchList(selectedDate, 1);
    setCurrentPage(1);
  }, [selectedDate, selectedMeal, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchList(selectedDate, 1);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedMeal('');
    setSelectedStatus('');
    setSearchTerm('');
    fetchList(selectedDate, 1);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchList(selectedDate, newPage);
  };

  // Quick date shortcuts
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const chartData = summary?.meals.map((m) => ({
    meal_type: m.meal_type,
    'Likely to attend': m.likely_count,
    'Not attending': m.unlikely_count,
    'No response': m.no_response_count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Student Attendance Intentions
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Operational headcounts and voluntary self-reported attendance submitted by hostel students.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Student Names Roster Button */}
          <button
            type="button"
            onClick={() => {
              setRosterModalMeal('');
              setIsRosterModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            title="View full list of student names categorized by intention (Yes / No / Maybe)"
          >
            <Users className="w-4 h-4 text-white" aria-hidden="true" />
            <span>View Student Names (Yes / No / Maybe)</span>
          </button>

          {/* Export Dataset Button for ML training */}
          <a
            href={intentionsApi.exportTrainingDataUrl(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#CBD5E1] rounded-md text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            title="Export intentions combined with operational actuals to CSV for offline model training"
          >
            <Download className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
            <span>Export ML Dataset (CSV)</span>
          </a>

          <button
            type="button"
            onClick={() => {
              fetchSummary(selectedDate);
              fetchList(selectedDate, currentPage);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#CBD5E1] rounded-md text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${isSummaryLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Guidance Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="intention-date-select" className="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
            <span>Selected Meal Date:</span>
          </label>
          <input
            id="intention-date-select"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-[#CBD5E1] rounded-md focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
          />

          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className={`px-2.5 py-1 text-xs rounded-md border font-medium ${
                selectedDate === todayStr
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-1 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] font-medium"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(2)}
              className="px-2.5 py-1 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] font-medium"
            >
              Day After
            </button>
          </div>
        </div>

        <div className="text-xs text-[#64748B] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0" />
          <span>Configured Mess Dining Capacity: <strong>556 students</strong></span>
        </div>
      </div>

      {/* Transparent Disclaimer Banner (HCI Golden Rule 7 & Interpretation Policy) */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-start gap-3 text-xs text-[#475569]">
        <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="text-[#1E293B]">Operational Headcount Interpretation:</strong> These figures represent
          voluntary self-reported intentions submitted by students before their respective cutoff deadlines.
          They serve as advance batch-portioning guidance for the kitchen. They are <strong>not confirmed turnstile attendance</strong>.
          Verified physical attendance is recorded separately post-meal.
        </div>
      </div>

      {summaryError && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C] flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4" />
          <span>{summaryError}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Unique Students */}
        <StatCard
          label="Unique Students Responded"
          value={summary?.total_unique_students ?? 0}
          unit="students"
          subtext={`Distinct students who replied for ${selectedDate}`}
          variant="primary"
          icon={<Users className="w-4 h-4" />}
        />

        {/* Total Submitted Intentions */}
        <StatCard
          label="Total Meal Responses"
          value={summary?.total_submitted_intentions ?? 0}
          unit="responses"
          subtext="Sum across Breakfast, Lunch & Dinner"
          variant="default"
          icon={<Calendar className="w-4 h-4" />}
        />

        {/* Per-Meal Cards */}
        {summary?.meals.map((meal) => (
          <div key={meal.meal_type} className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-[#1E293B]">{meal.meal_type}</span>
              <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                {meal.total_submitted} submitted
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-[#047857]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Likely:
                </span>
                <strong className="font-semibold">{meal.likely_count}</strong>
              </div>

              <div className="flex items-center justify-between text-[#B91C1C]">
                <span className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Not attending:
                </span>
                <strong className="font-semibold">{meal.unlikely_count}</strong>
              </div>

              <div className="flex items-center justify-between text-[#64748B]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> No response:
                </span>
                <strong className="font-semibold">{meal.no_response_count}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] flex justify-between">
              <span>Likely turnout rate:</span>
              <span className="font-medium text-[#1E293B]">{meal.turnout_percentage}%</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setRosterModalMeal(meal.meal_type);
                setIsRosterModalOpen(true);
              }}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#2563EB] border border-[#CBD5E1] hover:border-[#BFDBFE] rounded-md text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-label={`View student names for ${meal.meal_type}`}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>View Student Names ({meal.total_submitted})</span>
            </button>
          </div>
        ))}
      </div>

      {/* Visual Recharts Comparison */}
      <section aria-labelledby="intentions-chart-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9] mb-4">
          <div>
            <h2 id="intentions-chart-heading" className="text-base font-semibold text-[#1E293B]">
              Intention Breakdown by Meal Slot
            </h2>
            <p className="text-xs text-[#64748B]">
              Headcount comparison of students likely to attend, not attending, and unresponded for {selectedDate} (Capacity: 556)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAccessibleChartTable((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#CBD5E1] rounded-md text-xs font-medium text-[#334155] bg-white hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-pressed={showAccessibleChartTable}
          >
            <TableIcon className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{showAccessibleChartTable ? 'Show Chart' : 'Show Accessible Table'}</span>
          </button>
        </div>

        {!showAccessibleChartTable ? (
          <div className="h-72 w-full" aria-label="Bar chart comparing meal intention counts by meal type">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="meal_type" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} domain={[0, 556]} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} students`, name]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Likely to attend" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Not attending" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="No response" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#475569] uppercase tracking-wider text-left">
                <tr>
                  <th scope="col" className="px-4 py-3">Meal Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Likely to Attend</th>
                  <th scope="col" className="px-4 py-3 text-right">Not Attending</th>
                  <th scope="col" className="px-4 py-3 text-right">No Response</th>
                  <th scope="col" className="px-4 py-3 text-right">Total Submitted</th>
                  <th scope="col" className="px-4 py-3 text-right">Likely Turnout %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {summary?.meals.map((m) => (
                  <tr key={m.meal_type} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#1E293B]">{m.meal_type}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#047857]">{m.likely_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#B91C1C]">{m.unlikely_count}</td>
                    <td className="px-4 py-3 text-right text-[#64748B]">{m.no_response_count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1E293B]">{m.total_submitted}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#2563EB]">{m.turnout_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Individual Responses Table Section */}
      <section aria-labelledby="responses-table-heading" className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="responses-table-heading" className="text-base font-semibold text-[#1E293B]">
                Submitted Individual Student Intentions
              </h2>
              <p className="text-xs text-[#64748B]">
                Filter and inspect voluntary meal attendance intentions submitted by hostel students.
              </p>
            </div>

            <span className="text-xs text-[#475569] font-medium">
              Total Recorded Responses: <strong>{intentionsData?.total ?? 0}</strong>
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search student or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
              />
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            </form>

            <select
              aria-label="Filter by meal type"
              value={selectedMeal}
              onChange={(e) => setSelectedMeal(e.target.value)}
              className="px-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:ring-2 focus:ring-[#2563EB] focus:outline-none bg-white"
            >
              <option value="">All Meal Types</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
            </select>

            <select
              aria-label="Filter by intention status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:ring-2 focus:ring-[#2563EB] focus:outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="likely">Likely to attend</option>
              <option value="unlikely">Not attending</option>
              <option value="unsure">Unsure yet</option>
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-white border border-[#CBD5E1] text-[#475569] rounded-md text-xs font-medium hover:bg-[#F8FAFC]"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Table Content */}
        {isTableLoading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto" role="status" />
            <p className="mt-3 text-xs text-[#64748B]">Loading student intentions...</p>
          </div>
        ) : intentionsData?.items.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B] space-y-2">
            <Calendar className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="font-medium text-[#1E293B]">No student intentions recorded for the selected criteria</p>
            <p>Students can submit voluntary intentions through their Student Portal dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#475569] uppercase tracking-wider text-left">
                <tr>
                  <th scope="col" className="px-4 py-3">Student Name</th>
                  <th scope="col" className="px-4 py-3">Hostel / Room</th>
                  <th scope="col" className="px-4 py-3">Meal Date</th>
                  <th scope="col" className="px-4 py-3">Meal Slot</th>
                  <th scope="col" className="px-4 py-3">Intention Status</th>
                  <th scope="col" className="px-4 py-3">Student Notes</th>
                  <th scope="col" className="px-4 py-3 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-xs">
                {intentionsData?.items.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium text-[#1E293B]">
                      {row.student_name}
                      <span className="block text-[11px] text-[#64748B]">@{row.student_username}</span>
                    </td>
                    <td className="px-4 py-3 text-[#475569]">
                      {row.hostel_block || 'Hostel Block A'} &bull; Rm {row.room_number || '204'}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1E293B]">{row.meal_date}</td>
                    <td className="px-4 py-3 font-medium text-[#1E293B]">{row.meal_type}</td>
                    <td className="px-4 py-3">
                      {row.intention_status === 'likely' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                          <CheckCircle2 className="w-3 h-3" /> Likely to attend
                        </span>
                      ) : row.intention_status === 'unlikely' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                          <XCircle className="w-3 h-3" /> Not attending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                          <HelpCircle className="w-3 h-3" /> Unsure
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] italic max-w-xs truncate">
                      {row.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[#64748B]">
                      {new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {intentionsData && intentionsData.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#475569]">
            <span>
              Page {intentionsData.page} of {intentionsData.total_pages} ({intentionsData.total} total entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2.5 py-1.5 border border-[#CBD5E1] rounded-md bg-white hover:bg-[#F8FAFC] disabled:opacity-50 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={currentPage >= intentionsData.total_pages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2.5 py-1.5 border border-[#CBD5E1] rounded-md bg-white hover:bg-[#F8FAFC] disabled:opacity-50 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Student Names Roster Modal (Yes / No / Maybe) */}
      <StudentNamesRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        dateStr={selectedDate}
        initialMealType={rosterModalMeal}
      />
    </div>
  );
};
