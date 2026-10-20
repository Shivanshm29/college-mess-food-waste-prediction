import React, { useEffect, useState, useMemo } from 'react';
import { predictionsApi } from '../api/predictions';
import type { PaginatedPredictions, PredictionRecord } from '../types';
import { Badge } from '../components/Badge';
import { PredictionDetailModal } from './PredictionDetailModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LiveAnnouncer } from '../components/LiveAnnouncer';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export const PredictionHistory: React.FC = () => {
  const [data, setData] = useState<PaginatedPredictions | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [mealTypeFilter, setMealTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // Modals
  const [inspectItem, setInspectItem] = useState<PredictionRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<PredictionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Date range validation
  const dateRangeError = useMemo(() => {
    if (startDate && endDate && startDate > endDate) {
      return 'Start date cannot be after end date.';
    }
    return null;
  }, [startDate, endDate]);

  const fetchHistory = async () => {
    if (dateRangeError) return;

    try {
      setIsLoading(true);
      setError(null);
      const res = await predictionsApi.getAll({
        page,
        page_size: pageSize,
        meal_type: mealTypeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: debouncedSearch || undefined,
      });
      setData(res);
      setAnnouncement(
        `Showing page ${res.page} of ${res.total_pages}. ${res.total} matching records found.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load prediction history.');
      setAnnouncement('Failed to load prediction records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, mealTypeFilter, startDate, endDate, debouncedSearch]);

  const handleClearFilters = () => {
    setMealTypeFilter('');
    setStartDate('');
    setEndDate('');
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      setIsDeleting(true);
      await predictionsApi.delete(deleteItem.id);
      const msg = `Forecast #${deleteItem.id} for ${deleteItem.date} (${deleteItem.meal_type}) was deleted successfully.`;
      setFeedbackMessage(msg);
      setAnnouncement(msg);
      setDeleteItem(null);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to delete prediction');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(mealTypeFilter || startDate || endDate || debouncedSearch);

  return (
    <div className="space-y-6">
      <LiveAnnouncer message={announcement} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Prediction History
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Review and manage saved meal forecasts.
          </p>
        </div>

        <Link
          to="/predictions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span>New Prediction</span>
        </Link>
      </div>

      {/* Operation Feedback Toast */}
      {feedbackMessage && (
        <div
          role="status"
          className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg flex items-center justify-between text-sm text-[#15803D]"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[#15803D] hover:text-[#166534] p-1 rounded"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Date Range Warning */}
      {dateRangeError && (
        <div
          role="alert"
          className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg flex items-center gap-2.5 text-sm text-[#B45309]"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{dateRangeError}</span>
        </div>
      )}

      {/* Compact Filters Section */}
      <section aria-labelledby="filter-heading" className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm space-y-3">
        <h2 id="filter-heading" className="sr-only">Filter Prediction History</h2>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search menu items or record text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by menu item or keywords..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-[#CBD5E1] rounded-md focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] p-0.5"
                aria-label="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Meal Type Filter */}
            <select
              aria-label="Filter by meal type"
              value={mealTypeFilter}
              onChange={(e) => {
                setMealTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-[#CBD5E1] rounded-md px-3 py-2 bg-white text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <option value="">All Meals</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Snacks">Snacks</option>
              <option value="Dinner">Dinner</option>
            </select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-start-date" className="sr-only">Start Date</label>
              <input
                id="filter-start-date"
                type="date"
                aria-label="Start date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-[#CBD5E1] rounded-md px-2 py-2 text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                title="Start date"
              />
              <span className="text-xs text-[#64748B]">to</span>
              <label htmlFor="filter-end-date" className="sr-only">End Date</label>
              <input
                id="filter-end-date"
                type="date"
                aria-label="End date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-[#CBD5E1] rounded-md px-2 py-2 text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                title="End date"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 border border-[#CBD5E1] text-[#475569] text-sm rounded-md hover:bg-[#F8FAFC] flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                title="Reset all filters"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary & Matching Count */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B]">
          <div className="flex flex-wrap items-center gap-2">
            <span>Matching records:</span>
            <strong className="text-[#1E293B] font-semibold">
              {isLoading ? '...' : data?.total ?? 0}
            </strong>

            {hasActiveFilters && (
              <span className="text-[#94A3B8] ml-1">(Filters active)</span>
            )}
          </div>

          {data && data.total > 0 && (
            <div>
              Showing {(data.page - 1) * data.page_size + 1}–{Math.min(data.page * data.page_size, data.total)} of {data.total}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2E8F0] rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]" role="status">
            <span className="sr-only">Loading records...</span>
          </div>
          <p className="mt-3 text-sm text-[#64748B]">Retrieving prediction records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-center" role="alert">
          <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#B91C1C]">Failed to Load Prediction Records</h2>
          <p className="mt-1 text-xs text-[#7F1D1D]">{error}</p>
          <button
            type="button"
            onClick={fetchHistory}
            className="mt-3 px-3 py-1.5 bg-[#B91C1C] text-white text-xs font-medium rounded-md hover:bg-[#991B1B] focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
          >
            Retry
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        /* Empty States */
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-[#1E293B]">
              {hasActiveFilters ? 'No Matching Predictions Found' : 'No Meal Forecasts Recorded Yet'}
            </h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {hasActiveFilters
                ? 'No saved predictions match your current search terms or date range. Try broadening your criteria or clearing active filters.'
                : 'You have not saved any meal forecasts yet. Create a prediction to begin logging dining attendance and food preparation data.'}
            </p>
            <div className="pt-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 border border-[#CBD5E1] text-xs font-medium rounded-md hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  to="/predictions/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-md hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Create First Prediction</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop & Tablet Table */
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Date & Day</th>
                  <th scope="col" className="px-4 py-3">Meal</th>
                  <th scope="col" className="px-4 py-3">Main Menu</th>
                  <th scope="col" className="px-4 py-3 text-right">Expected Students</th>
                  <th scope="col" className="px-4 py-3 text-right">Food Required</th>
                  <th scope="col" className="px-4 py-3 text-right">Food Wastage</th>
                  <th scope="col" className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {data.items.map((record) => (
                  <tr key={record.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-[#1E293B]">{record.date}</div>
                      <div className="text-xs text-[#64748B]">
                        {record.day_of_week}
                        {record.is_weekend && (
                          <span className="ml-1.5 text-[10px] text-[#B45309] font-medium">[Weekend]</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="info" showIcon={false}>{record.meal_type}</Badge>
                      {record.special_meal === 'Yes' && (
                        <div className="text-[11px] text-[#B45309] font-semibold mt-0.5">Special Meal</div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-sm text-[#334155]">
                      <div className="line-clamp-2 leading-relaxed" title={record.main_menu_items}>
                        {record.main_menu_items}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1E293B] whitespace-nowrap">
                      {record.expected_students} students
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#2563EB] whitespace-nowrap">
                      {record.expected_food_required_kg} kg
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#B45309] whitespace-nowrap">
                      <div>{record.expected_food_wastage_kg} kg</div>
                      <div className="text-[10px] text-[#94A3B8]">
                        ({record.waste_percentage}%)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectItem(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-transparent hover:border-[#BFDBFE] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          aria-label={`View full details of forecast #${record.id} for ${record.date}`}
                          title="View complete details"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteItem(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded border border-transparent hover:border-[#FECACA] focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                          aria-label={`Delete forecast #${record.id} for ${record.date}`}
                          title="Delete forecast record"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Showing <span className="font-medium text-[#1E293B]">{(data.page - 1) * data.page_size + 1}</span> to{' '}
              <span className="font-medium text-[#1E293B]">
                {Math.min(data.page * data.page_size, data.total)}
              </span>{' '}
              of <span className="font-medium text-[#1E293B]">{data.total}</span> records
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="px-3 py-1.5 border border-[#CBD5E1] rounded bg-white text-[#334155] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                aria-label="Go to previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Previous</span>
              </button>

              <span className="px-2 font-medium text-[#1E293B]">
                Page {data.page} of {data.total_pages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={data.page >= data.total_pages}
                className="px-3 py-1.5 border border-[#CBD5E1] rounded bg-white text-[#334155] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                aria-label="Go to next page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectItem && (
        <PredictionDetailModal
          prediction={inspectItem}
          isOpen={!!inspectItem}
          onClose={() => setInspectItem(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteItem && (
        <ConfirmDialog
          isOpen={!!deleteItem}
          title="Delete Meal Forecast"
          message={`Are you sure you want to delete forecast #${deleteItem.id} for ${deleteItem.date} (${deleteItem.meal_type})? This action cannot be undone.`}
          confirmLabel="Delete Forecast"
          cancelLabel="Keep Forecast"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};
