import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../api/analytics';
import { AnalyticsSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Utensils,
  Trash2,
  Calendar,
  Table as TableIcon,
  TrendingDown,
  Info,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTableView, setShowTableView] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await analyticsApi.getSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" role="status">
          <span className="sr-only">Calculating descriptive analytics...</span>
        </div>
        <p className="mt-4 text-sm text-[#64748B]">Aggregating prediction metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" aria-hidden="true" />
        <h2 className="text-base font-semibold text-[#B91C1C]">Failed to Load Analytics</h2>
        <p className="mt-1 text-sm text-[#7F1D1D]">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-[#B91C1C] text-white text-xs font-medium rounded-md hover:bg-[#991B1B]"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasHistory = data?.has_history && (data?.total_records ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Page Title & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Operational Analytics & Trends
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Descriptive statistics and production requirements evaluated across saved meal forecasts.
          </p>
        </div>

        {hasHistory && (
          <button
            type="button"
            onClick={() => setShowTableView((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#CBD5E1] rounded-md text-xs font-medium text-[#334155] bg-white hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-pressed={showTableView}
          >
            <TableIcon className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
            <span>{showTableView ? 'Switch to Graphical Charts' : 'View Accessible Data Tables'}</span>
          </button>
        )}
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tracked Meals"
          value={hasHistory ? data?.total_records ?? 0 : 0}
          unit="logged"
          subtext="Saved forecasts evaluated"
          variant="primary"
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Expected Food Required (Total kg)"
          value={hasHistory ? data?.total_expected_food_kg ?? 0 : '--'}
          unit={hasHistory ? 'kg' : ''}
          subtext="Total predicted cooking volume"
          variant="default"
          icon={<Utensils className="w-4 h-4" />}
        />
        <StatCard
          label="Expected Food Wastage (Total kg)"
          value={hasHistory ? data?.total_expected_wastage_kg ?? 0 : '--'}
          unit={hasHistory ? 'kg' : ''}
          subtext="Total predicted leftover scrap"
          variant="warning"
          icon={<Trash2 className="w-4 h-4" />}
        />
        <StatCard
          label="Overall Expected Waste Rate"
          value={hasHistory ? `${data?.overall_waste_percentage}%` : '--'}
          subtext="Wastage vs total prepared food"
          variant="default"
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Transparent Disclaimer */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-start gap-3 text-xs text-[#64748B]">
        <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="text-[#334155]">Methodological Transparency:</strong> These statistics represent
          aggregations of the machine-learning model's outputs across your saved meal configurations.
          They reflect planned food quantities and modeled waste patterns, not physical plate-scraping weights
          measured in the dining hall. Unmeasured 'actual' reductions are not claimed.
        </div>
      </div>

      {/* Empty State */}
      {!hasHistory && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center my-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto border border-[#BFDBFE]">
              <BarChart3 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1E293B]">No Analytics Available Yet</h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Analytics charts and data tables require saved meal forecasts. Once you create forecasts for
                various meals and dates, trendlines and meal breakdowns will appear here automatically.
              </p>
            </div>
            <Link
              to="/predictions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-md hover:bg-[#1D4ED8]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Meal Prediction</span>
            </Link>
          </div>
        </div>
      )}

      {/* Graphical Charts View */}
      {hasHistory && !showTableView && (
        <div className="space-y-6">
          {/* Timeline Chart */}
          <section aria-labelledby="timeline-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="pb-3 border-b border-[#F1F5F9] mb-4">
              <h2 id="timeline-heading" className="text-base font-semibold text-[#1E293B]">
                Expected Food Required & Expected Food Wastage Over Time
              </h2>
              <p className="text-xs text-[#64748B]">
                Chronological sequence of saved predictions (in kilograms)
              </p>
            </div>

            <div className="h-80 w-full" aria-label="Line chart showing food required and wastage over time">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.timeline}
                  margin={{ top: 15, right: 30, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    angle={-25}
                    textAnchor="end"
                    tickLine={false}
                  />
                  <YAxis stroke="#64748B" fontSize={11} unit="kg" tickLine={false} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} kg`,
                      name === 'expected_food_required_kg' ? 'Expected Food Required' : 'Expected Food Wastage',
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
                    formatter={(v) =>
                      v === 'expected_food_required_kg' ? 'Expected Food Required (kg)' : 'Expected Food Wastage (kg)'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="expected_food_required_kg"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="expected_food_required_kg"
                  />
                  <Line
                    type="monotone"
                    dataKey="expected_food_wastage_kg"
                    stroke="#B45309"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="expected_food_wastage_kg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Meal Breakdown Bar Chart */}
          <section aria-labelledby="meal-bar-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="pb-3 border-b border-[#F1F5F9] mb-4">
              <h2 id="meal-bar-heading" className="text-base font-semibold text-[#1E293B]">
                Average Quantities by Meal Type
              </h2>
              <p className="text-xs text-[#64748B]">
                Mean food production and expected waste comparison (in kg)
              </p>
            </div>

            <div className="h-72 w-full" aria-label="Bar chart showing food required vs waste by meal type">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.by_meal}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="meal_type" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} unit="kg" tickLine={false} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} kg`,
                      name === 'avg_expected_food_kg' ? 'Avg Expected Food Required' : 'Avg Expected Food Wastage',
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
                    formatter={(v) =>
                      v === 'avg_expected_food_kg' ? 'Avg Expected Food Required (kg)' : 'Avg Expected Food Wastage (kg)'
                    }
                  />
                  <Bar dataKey="avg_expected_food_kg" fill="#2563EB" name="avg_expected_food_kg" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_expected_wastage_kg" fill="#B45309" name="avg_expected_wastage_kg" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Accessible Table Alternative View (WCAG 2.2 AA) */}
      {hasHistory && showTableView && (
        <div className="space-y-6">
          {/* Meal-Wise Table */}
          <section aria-labelledby="meal-table-heading" className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 id="meal-table-heading" className="text-sm font-semibold text-[#1E293B]">
                Accessible Data: Meal Type Aggregate Summary
              </h2>
              <p className="text-xs text-[#64748B]">Exact numerical values for screen-reader and keyboard users</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#475569] uppercase tracking-wider text-left">
                  <tr>
                    <th scope="col" className="px-4 py-3">Meal Type</th>
                    <th scope="col" className="px-4 py-3 text-right">Predictions Count</th>
                    <th scope="col" className="px-4 py-3 text-right">Avg Expected Students</th>
                    <th scope="col" className="px-4 py-3 text-right">Avg Expected Food Required (kg)</th>
                    <th scope="col" className="px-4 py-3 text-right">Avg Expected Food Wastage (kg)</th>
                    <th scope="col" className="px-4 py-3 text-right">Avg Waste Rate (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {data?.by_meal.map((m) => (
                    <tr key={m.meal_type} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-medium text-[#1E293B]">{m.meal_type}</td>
                      <td className="px-4 py-3 text-right text-[#475569]">{m.count}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#1E293B]">{m.avg_expected_students}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#2563EB]">{m.avg_expected_food_kg} kg</td>
                      <td className="px-4 py-3 text-right font-medium text-[#B45309]">{m.avg_expected_wastage_kg} kg</td>
                      <td className="px-4 py-3 text-right text-[#475569]">{m.avg_waste_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Timeline Table */}
          <section aria-labelledby="timeline-table-heading" className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 id="timeline-table-heading" className="text-sm font-semibold text-[#1E293B]">
                Accessible Data: Forecast Chronological Sequence
              </h2>
              <p className="text-xs text-[#64748B]">All logged entries listed in chronological order</p>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#475569] uppercase tracking-wider text-left sticky top-0">
                  <tr>
                    <th scope="col" className="px-4 py-3">Meal Date</th>
                    <th scope="col" className="px-4 py-3">Meal Type</th>
                    <th scope="col" className="px-4 py-3 text-right">Expected Students</th>
                    <th scope="col" className="px-4 py-3 text-right">Expected Food Required (kg)</th>
                    <th scope="col" className="px-4 py-3 text-right">Expected Food Wastage (kg)</th>
                    <th scope="col" className="px-4 py-3 text-right">Waste %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {data?.timeline.map((point, idx) => (
                    <tr key={`${point.date}-${point.meal_type}-${idx}`} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-2.5 font-medium text-[#1E293B]">{point.date}</td>
                      <td className="px-4 py-2.5 text-[#475569]">{point.meal_type}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[#1E293B]">{point.expected_students}</td>
                      <td className="px-4 py-2.5 text-right text-[#2563EB]">{point.expected_food_required_kg} kg</td>
                      <td className="px-4 py-2.5 text-right text-[#B45309]">{point.expected_food_wastage_kg} kg</td>
                      <td className="px-4 py-2.5 text-right text-[#64748B]">{point.waste_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
