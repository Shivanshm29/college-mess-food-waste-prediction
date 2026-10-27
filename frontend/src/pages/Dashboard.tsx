import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { intentionsApi } from '../api/intentions';
import type { DashboardSummary, PredictionRecord, DateIntentionsSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { PredictionDetailModal } from './PredictionDetailModal';
import {
  Users,
  Utensils,
  Trash2,
  Calendar,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { determineNextAvailableMeal } from '../utils/nextMeal';
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

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [todayIntentions, setTodayIntentions] = useState<DateIntentionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionRecord | null>(null);
  const [showChartTable, setShowChartTable] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterMeal, setRosterMeal] = useState('');
  const nextMealPreview = determineNextAvailableMeal();

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];
      const [resSummary, resIntentions] = await Promise.allSettled([
        dashboardApi.getSummary(),
        intentionsApi.getSummary(todayStr),
      ]);

      if (resSummary.status === 'fulfilled') {
        setData(resSummary.value);
      } else {
        throw resSummary.reason;
      }

      if (resIntentions.status === 'fulfilled') {
        setTodayIntentions(resIntentions.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" role="status">
          <span className="sr-only">Loading dashboard metrics...</span>
        </div>
        <p className="mt-4 text-sm text-[#64748B]">Loading meal operational metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" aria-hidden="true" />
        <h2 className="text-base font-semibold text-[#B91C1C]">Unable to Load Dashboard</h2>
        <p className="mt-1 text-sm text-[#7F1D1D]">{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 bg-[#B91C1C] text-white text-xs font-medium rounded-md hover:bg-[#991B1B] focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const hasHistory = data?.has_history && (data?.total_predictions ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Dashboard
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Operational summary of saved meal forecasts and preparation requirements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/predictions/new?shortcut=next_meal"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-sm font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
            title={`Auto-fill prediction inputs for ${nextMealPreview.label}`}
          >
            <Zap className="w-4 h-4 fill-[#2563EB] text-[#2563EB]" aria-hidden="true" />
            <span>Predict Next Meal ({nextMealPreview.meal_type})</span>
          </Link>

          <Link
            to="/predictions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>New Prediction</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Saved Forecasts"
          value={hasHistory ? data?.total_predictions ?? 0 : 0}
          unit="records"
          subtext={hasHistory ? 'Persisted in database log' : 'No records yet'}
          variant="primary"
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Expected Students"
          value={hasHistory ? data?.avg_expected_students ?? 0 : '--'}
          unit={hasHistory ? 'students' : ''}
          subtext={hasHistory ? 'Mean projected dining turnout' : 'Awaiting predictions'}
          variant="default"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Expected Food Required (kg)"
          value={hasHistory ? data?.avg_expected_food_kg ?? 0 : '--'}
          unit={hasHistory ? 'kg' : ''}
          subtext={hasHistory ? 'Mean cooking batch volume' : 'Awaiting predictions'}
          variant="default"
          icon={<Utensils className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Expected Food Wastage (kg)"
          value={hasHistory ? data?.avg_expected_wastage_kg ?? 0 : '--'}
          unit={hasHistory ? 'kg' : ''}
          subtext={hasHistory ? `${data?.avg_waste_percentage}% of total prepared food` : 'Zero waste tracked'}
          variant="warning"
          icon={<Trash2 className="w-4 h-4" />}
        />
      </div>

      {/* Advance Student Attendance Intentions Widget */}
      {todayIntentions && (
        <section
          aria-labelledby="intentions-summary-heading"
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-[#2563EB] rounded-lg border border-blue-100">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="intentions-summary-heading" className="text-base font-semibold text-[#1E293B]">
                    Today's Student Attendance Intentions
                  </h2>
                  <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {todayIntentions.date}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Advance voluntary submissions • {todayIntentions.total_unique_students} unique student{todayIntentions.total_unique_students === 1 ? '' : 's'} responded ({todayIntentions.total_submitted_intentions} total meal selections)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRosterMeal('');
                  setIsRosterModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-3 py-1.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                title="View student names list categorized by Yes, No, or Maybe"
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>View Student Names</span>
              </button>
              <Link
                to="/intentions"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <span>Manage & Export</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['Breakfast', 'Lunch', 'Dinner'] as const).map((meal) => {
              const item = todayIntentions.meals.find((m) => m.meal_type === meal);
              return (
                <div
                  key={meal}
                  className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#1E293B]">{meal}</span>
                    <span className="text-xs text-[#64748B] bg-white border border-[#CBD5E1] px-2 py-0.5 rounded">
                      {item ? item.total_submitted : 0} submitted
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Likely to attend
                      </span>
                      <strong className="text-emerald-800 text-sm">{item ? item.likely_count : 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Not attending
                      </span>
                      <strong className="text-rose-800 text-sm">{item ? item.unlikely_count : 0}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        No response (of {todayIntentions.configured_capacity})
                      </span>
                      <span className="font-semibold text-slate-700">{item ? item.no_response_count : todayIntentions.configured_capacity}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRosterMeal(meal);
                      setIsRosterModalOpen(true);
                    }}
                    className="w-full mt-2.5 inline-flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium text-[#2563EB] bg-white hover:bg-blue-50 border border-blue-200 rounded transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    <span>View Names List ({item ? item.total_submitted : 0})</span>
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[#64748B] bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>HCI Operational Rule:</strong> Student intention submissions indicate planned dining turnout before cutoff deadlines. They do not constitute verified physical entry scans or final food consumed.
          </p>
        </section>
      )}

      {/* Empty State Banner if No History */}
      {!hasHistory && (
        <section aria-labelledby="empty-state-heading" className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-8 text-center my-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="empty-state-heading" className="text-lg font-semibold text-[#1E293B]">
                No Saved Predictions Yet
              </h2>
              <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                Summary metrics and meal breakdowns populate automatically from your saved predictions.
                Generate a prediction to start tracking attendance, food requirements, and expected wastage.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/predictions/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>Create First Prediction</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Chart Section (Only shown when history exists) */}
      {hasHistory && data?.meal_wise_summary && data.meal_wise_summary.length > 0 && (
        <section aria-labelledby="chart-heading" className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F1F5F9] mb-4 gap-2">
            <div>
              <h2 id="chart-heading" className="text-base font-semibold text-[#1E293B]">
                Average Quantities by Meal Type
              </h2>
              <p className="text-xs text-[#64748B]">
                Descriptive averages calculated solely from saved predictions (Estimates, not measured plate scrapings)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded">
                Unit: Kilograms (kg)
              </span>
              <button
                type="button"
                onClick={() => setShowChartTable((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#475569] bg-white border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                aria-pressed={showChartTable}
              >
                <TableIcon className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
                <span>{showChartTable ? 'Show Chart' : 'Show Data Table'}</span>
              </button>
            </div>
          </div>

          {showChartTable ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                <caption className="sr-only">Average food required and expected wastage in kilograms by meal type</caption>
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Meal Type</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Avg Food Required (kg)</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Avg Wastage (kg)</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Waste Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {data.meal_wise_summary.map((row) => (
                    <tr key={row.meal_type} className="hover:bg-[#F8FAFC]">
                      <th scope="row" className="px-4 py-2.5 font-medium text-[#1E293B]">{row.meal_type}</th>
                      <td className="px-4 py-2.5 text-right text-[#2563EB] font-medium">{row.avg_expected_food_kg} kg</td>
                      <td className="px-4 py-2.5 text-right text-[#B45309] font-medium">{row.avg_expected_wastage_kg} kg</td>
                      <td className="px-4 py-2.5 text-right text-[#64748B]">
                        {row.avg_expected_food_kg > 0
                          ? `${((row.avg_expected_wastage_kg / row.avg_expected_food_kg) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full" aria-label="Bar chart showing food required vs wastage by meal">
              {/* Screen reader text alternative */}
              <div className="sr-only">
                {data.meal_wise_summary.map((row) => (
                  <p key={row.meal_type}>
                    {row.meal_type}: Average food required {row.avg_expected_food_kg} kg, average expected wastage {row.avg_expected_wastage_kg} kg.
                  </p>
                ))}
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.meal_wise_summary}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="meal_type" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} unit="kg" />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} kg`,
                      name === 'avg_expected_food_kg' ? 'Avg Food Required' : 'Avg Expected Wastage',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    formatter={(value) =>
                      value === 'avg_expected_food_kg' ? 'Food Required (kg)' : 'Expected Wastage (kg)'
                    }
                  />
                  <Bar dataKey="avg_expected_food_kg" fill="#2563EB" name="avg_expected_food_kg" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_expected_wastage_kg" fill="#B45309" name="avg_expected_wastage_kg" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* Recent Predictions Table */}
      {hasHistory && (
        <section aria-labelledby="recent-heading" className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 id="recent-heading" className="text-base font-semibold text-[#1E293B]">
                Recent Predictions
              </h2>
              <p className="text-xs text-[#64748B]">Latest forecasting entries logged in database</p>
            </div>
            <Link
              to="/predictions/history"
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-0.5"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-semibold text-[#475569] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Meal Date</th>
                  <th scope="col" className="px-4 py-3">Meal Type</th>
                  <th scope="col" className="px-4 py-3">Main Menu</th>
                  <th scope="col" className="px-4 py-3 text-right">Expected Students</th>
                  <th scope="col" className="px-4 py-3 text-right">Expected Food Required (kg)</th>
                  <th scope="col" className="px-4 py-3 text-right">Expected Food Wastage (kg)</th>
                  <th scope="col" className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {data?.recent_predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1E293B] whitespace-nowrap">
                      <div>{p.date}</div>
                      <span className="text-xs text-[#64748B]">{p.day_of_week}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="info" showIcon={false}>{p.meal_type}</Badge>
                      {p.special_meal === 'Yes' && (
                        <span className="ml-1.5 text-xs text-[#B45309] font-medium">[Special]</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs text-[#475569]">
                      <div className="line-clamp-2" title={p.main_menu_items}>
                        {p.main_menu_items}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1E293B]">
                      {p.expected_students}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#2563EB]">
                      {p.expected_food_required_kg} kg
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#B45309]">
                      {p.expected_food_wastage_kg} kg
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPrediction(p)}
                        className="text-xs font-medium text-[#2563EB] hover:underline px-2.5 py-1 rounded hover:bg-[#EFF6FF] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Prediction Detail Modal */}
      {selectedPrediction && (
        <PredictionDetailModal
          prediction={selectedPrediction}
          isOpen={!!selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
          onActualsUpdated={() => fetchSummary()}
        />
      )}

      {/* Student Names Roster Modal (Yes / No / Maybe) */}
      <StudentNamesRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        dateStr={todayIntentions?.date || new Date().toISOString().split('T')[0]}
        initialMealType={rosterMeal}
      />
    </div>
  );
};
