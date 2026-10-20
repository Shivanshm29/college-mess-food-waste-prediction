import React, { useEffect, useState } from 'react';
import { modelApi } from '../api/model';
import { ModelInfo as ModelInfoType, ModelPreviewResponse, PredictionInput, WeatherType } from '../types';
import { Badge } from '../components/Badge';
import { getAutoDecidedMenu } from '../utils/menuSchedule';
import {
  BrainCircuit,
  Database,
  Layers,
  Scale,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Copy,
  Check,
  Search,
  Play,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ModelInfo: React.FC = () => {
  const [info, setInfo] = useState<ModelInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [featureSearch, setFeatureSearch] = useState('');

  // Interactive Sandbox State
  const [sandboxDate, setSandboxDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [sandboxMeal, setSandboxMeal] = useState<'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('Lunch');
  const [sandboxMenu, setSandboxMenu] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return getAutoDecidedMenu(dayNames[d.getDay()] || 'Wednesday', 'Lunch', 'No');
  });
  const [sandboxSpecial, setSandboxSpecial] = useState<'Yes' | 'No'>('No');
  const [sandboxHoliday, setSandboxHoliday] = useState(false);
  const [sandboxExam, setSandboxExam] = useState(false);
  const [sandboxEvent, setSandboxEvent] = useState(false);
  const [sandboxWeather, setSandboxWeather] = useState<WeatherType>('Clear');
  const [sandboxCapacity, setSandboxCapacity] = useState(556);



  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<ModelPreviewResponse | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  // Auto-decide sandbox menu items whenever date, meal, or special status changes
  useEffect(() => {
    const d = new Date(sandboxDate + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dName = dayNames[d.getDay()] || 'Wednesday';
    const autoM = getAutoDecidedMenu(dName, sandboxMeal, sandboxSpecial);
    if (autoM) {
      setSandboxMenu(autoM);
    }
  }, [sandboxDate, sandboxMeal, sandboxSpecial]);


  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setIsLoading(true);
        const res = await modelApi.getInfo();
        setInfo(res);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve model information');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, []);

  const handleCopyModelCard = () => {
    if (!info) return;
    const text = `# College Mess Planning ML Model Card
Model: ${info.algorithm}
Version: ${info.model_version}
Default Capacity: ${info.capacity_default} Students
Dataset: ${info.dataset_name} (${info.total_rows} samples)
Partition: ${info.train_test_split_method}
Features (${info.features.length}): ${info.features.join(', ')}
Targets:
- expected_students: MAE=${info.metrics.expected_students?.MAE}, R²=${info.metrics.expected_students?.R2}
- expected_food_required_kg: MAE=${info.metrics.expected_food_required_kg?.MAE}, R²=${info.metrics.expected_food_required_kg?.R2}
- expected_food_wastage_kg: MAE=${info.metrics.expected_food_wastage_kg?.MAE}, R²=${info.metrics.expected_food_wastage_kg?.R2}

Operational Context: ${info.limitations_disclaimer}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSandboxLoading(true);
    setSandboxError(null);

    const payload: PredictionInput = {
      date: sandboxDate,
      meal_type: sandboxMeal,
      main_menu_items: sandboxMenu,
      special_meal: sandboxSpecial,
      mess_capacity_students: Number(sandboxCapacity),
      is_holiday: sandboxHoliday,
      exam_on_day: sandboxExam,
      college_event: sandboxEvent,
      weather_condition: sandboxWeather,
    };

    try {
      const res = await modelApi.preview(payload);
      setSandboxResult(res);
    } catch (err: any) {
      setSandboxError(err.message || 'Sandbox simulation failed');
    } finally {
      setSandboxLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]" role="status">
          <span className="sr-only">Loading model details...</span>
        </div>
        <p className="mt-3 text-sm text-[#64748B]">Loading ML architecture and metrics...</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="p-6 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-center" role="alert">
        <AlertTriangle className="w-8 h-8 text-[#B91C1C] mx-auto mb-2" />
        <h2 className="text-base font-semibold text-[#B91C1C]">Unable to Retrieve Model Info</h2>
        <p className="mt-1 text-xs text-[#7F1D1D]">{error || 'Unknown error occurred'}</p>
      </div>
    );
  }

  // Derive sandbox day & weekend
  const parsedDate = new Date(sandboxDate + 'T00:00:00');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const derivedDay = dayNames[parsedDate.getDay()] || 'Monday';
  const isWeekend = parsedDate.getDay() === 0 || parsedDate.getDay() === 6;

  // Filter features
  const filteredFeatures = info.features.filter((f) =>
    f.toLowerCase().includes(featureSearch.toLowerCase()) ||
    (info.feature_details?.[f]?.role || '').toLowerCase().includes(featureSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="pb-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
              <BrainCircuit className="w-3.5 h-3.5" />
              ExtraTreesRegressor v{info.model_version}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
              Capacity: {info.capacity_default} Max
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
              80/20 Chronological Split
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Machine Learning Model & Architecture Information
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Technical specification, regression benchmarks, feature dictionary, physical invariants, and academic limitations for the college mess planning system.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyModelCard}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1E293B] bg-white border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
            title="Copy plain-text Model Card to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#15803D]" />
                <span className="text-[#15803D]">Card Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Copy Model Card</span>
              </>
            )}
          </button>

          <a
            href="#interactive-sandbox"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Simulator</span>
          </a>
        </div>
      </div>

      {/* Operational Deployment Card */}
      <section
        aria-labelledby="overview-heading"
        className="p-5 bg-[#EFF6FF] border-l-4 border-l-[#2563EB] border border-[#BFDBFE] rounded-xl shadow-sm"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2 text-xs text-[#1E40AF]">
            <h2 id="overview-heading" className="font-semibold text-sm text-[#1E3A8A]">
              Operational Scope & Model Deployment Context
            </h2>
            <p className="leading-relaxed">
              {info.limitations_disclaimer ||
                'The predictive ensemble model forecasts meal turnout, cooking mass requirements, and food scrap volumes using historical mess dining records to assist managers in batch planning.'}
            </p>
            <div className="pt-2 border-t border-[#BFDBFE]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-medium text-[#1E40AF]">
              <span>
                <strong>Primary Objective:</strong> Eliminate over-preparation and minimize preventable dining hall food waste.
              </span>
              <span className="text-right flex-shrink-0 font-normal">
                Hostel Dining Hall (Capacity: {info.capacity_default} Students)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section Navigation Pills */}
      <nav aria-label="Model sections" className="flex flex-wrap gap-2 pb-1 border-b border-[#E2E8F0]">
        {[
          { id: 'all', label: 'All Sections' },
          { id: 'architecture', label: 'Architecture & Pipeline' },
          { id: 'metrics', label: 'Regression Benchmarks' },
          { id: 'features', label: 'Feature Dictionary' },
          { id: 'safeguards', label: 'Domain Safeguards' },
          { id: 'sandbox', label: 'Interactive Sandbox' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
              activeTab === tab.id
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* SECTION 1: Architecture & Pipeline */}
      {(activeTab === 'all' || activeTab === 'architecture') && (
        <section aria-labelledby="arch-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h2 id="arch-heading" className="text-base font-semibold text-[#1E293B] flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
              <span>Pipeline Architecture & Training Setup</span>
            </h2>
            <Badge variant="neutral">scikit-learn 1.4+ Pipeline</Badge>
          </div>

          {/* Visual Step-by-Step Flow */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-3">
              End-to-End Prediction Inference Flow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#2563EB] block">STEP 1</span>
                <span className="font-semibold text-[#1E293B] block">Input Vector</span>
                <p className="text-[11px] text-[#64748B]">
                  10 Contextual features (calendar, weather, meal type, menu)
                </p>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#2563EB] block">STEP 2</span>
                <span className="font-semibold text-[#1E293B] block">Preprocessing</span>
                <p className="text-[11px] text-[#64748B]">
                  OneHotEncoder handles unseen menu/weather categories safely
                </p>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#2563EB] block">STEP 3</span>
                <span className="font-semibold text-[#1E293B] block">Ensemble Regressor</span>
                <p className="text-[11px] text-[#64748B]">
                  ExtraTreesRegressor (250 randomized decision trees)
                </p>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#2563EB] block">STEP 4</span>
                <span className="font-semibold text-[#1E293B] block">Domain Safeguards</span>
                <p className="text-[11px] text-[#64748B]">
                  Clamps to [0, 556] & enforces mass conservation (waste ≤ food)
                </p>
              </div>

              <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-[#2563EB] block">OUTPUT</span>
                <span className="font-semibold text-[#1E293B] block">Production Forecast</span>
                <p className="text-[11px] text-[#475569]">
                  Students, Cooking Volume (kg), and Leftovers (kg)
                </p>
              </div>
            </div>
          </div>

          {/* Architecture Specifications Grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <dt className="text-[#64748B] font-medium">Core Algorithm</dt>
              <dd className="font-semibold text-[#1E293B] mt-1 text-sm">ExtraTreesRegressor</dd>
              <p className="text-[11px] text-[#64748B] mt-0.5">Extremely Randomized Trees Ensemble</p>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <dt className="text-[#64748B] font-medium">Dataset Partitioning</dt>
              <dd className="font-semibold text-[#1E293B] mt-1 text-sm">80/20 Chronological Split</dd>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Cutoff Date: {info.train_until_exclusive || '2025-11-23'}
              </p>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <dt className="text-[#64748B] font-medium">Sample Volume</dt>
              <dd className="font-semibold text-[#1E293B] mt-1 text-sm">{info.total_rows} Records</dd>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                {info.train_rows} Train &bull; {info.test_rows} Holdout Test
              </p>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <dt className="text-[#64748B] font-medium">Categorical Strategy</dt>
              <dd className="font-semibold text-[#1E293B] mt-1 text-sm">OneHotEncoder</dd>
              <p className="text-[11px] text-[#64748B] mt-0.5">handle_unknown='ignore' (robust to new foods)</p>
            </div>
          </dl>

          {/* Hyperparameters Table */}
          {info.hyperparameters && (
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="bg-[#F8FAFC] px-4 py-2 border-b border-[#E2E8F0]">
                <h3 className="text-xs font-semibold text-[#1E293B]">Tuned Hyperparameters</h3>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                {Object.entries(info.hyperparameters).map(([key, val]) => (
                  <div key={key} className="p-2 bg-white border border-[#E2E8F0] rounded">
                    <span className="text-[#64748B] text-[10px] block font-mono">{key}</span>
                    <span className="font-semibold text-[#1E293B] text-xs font-mono">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: Evaluation Metrics */}
      {(activeTab === 'all' || activeTab === 'metrics') && (
        <section aria-labelledby="metrics-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-2">
            <div>
              <h2 id="metrics-heading" className="text-base font-semibold text-[#1E293B] flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
                <span>Holdout Chronological Test Set Benchmarks</span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Evaluated on {info.test_rows} strictly future test observations (chronological holdout split).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-[#475569] font-medium self-start sm:self-auto">
              Evaluation Samples: {info.test_rows}
            </span>
          </div>

          {/* Three Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.entries(info.metrics).map(([targetName, m]) => {
              const mean = m.actual_test_mean || 1;
              const mape = ((m.MAE / mean) * 100).toFixed(2);
              const label = targetName.replace(/_/g, ' ');

              return (
                <div
                  key={targetName}
                  className="p-4 bg-white border-2 border-[#E2E8F0] rounded-xl shadow-xs space-y-4 hover:border-blue-200 transition-colors"
                >
                  <div className="border-b border-[#F1F5F9] pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                        {label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-[#2563EB] rounded font-mono font-medium">
                        Target
                      </span>
                    </div>
                    {m.actual_test_mean !== undefined && (
                      <p className="text-xs text-[#64748B] mt-1">
                        Test Mean: <strong className="text-[#1E293B]">{m.actual_test_mean.toFixed(1)}</strong>{' '}
                        {targetName.includes('student') ? 'students' : 'kg'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                      <span className="text-[#64748B] font-medium">MAE (Mean Absolute Error):</span>
                      <span className="font-bold text-[#1E293B]">{m.MAE}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                      <span className="text-[#64748B] font-medium">RMSE (Root Mean Square):</span>
                      <span className="font-bold text-[#1E293B]">{m.RMSE}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-emerald-50 rounded border border-emerald-200">
                      <span className="text-[#15803D] font-medium">R² Score (Goodness of Fit):</span>
                      <span className="font-bold text-[#15803D]">{m.R2}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#64748B] px-1">
                      <span>Relative Error (MAE / Mean):</span>
                      <span className="font-semibold text-[#1E293B]">{mape}%</span>
                    </div>
                  </div>

                  {/* Practical Meaning for Mess Manager */}
                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg text-[11px] text-[#475569] leading-relaxed border border-[#E2E8F0]">
                    <span className="font-semibold text-[#1E293B] block mb-0.5">Operational Context:</span>
                    {targetName === 'expected_students' &&
                      'Headcount variance averages ~14.8 students per meal. Enables kitchen staff to scale batch sizes accurately without broad guesswork.'}
                    {targetName === 'expected_food_required_kg' &&
                      'Cooking mass variance is ~6.2 kg per meal batch, stabilizing raw ingredient procurement and portion preparation.'}
                    {targetName === 'expected_food_wastage_kg' &&
                      'Predicted unserved and plate leftovers average within ~0.86 kg, facilitating precise waste reduction targets.'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metric Interpretation Guide */}
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-2">
            <h3 className="font-semibold text-[#1E293B] flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#2563EB]" />
              <span>How to Interpret Regression Metrics in College Dining</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-[#475569] pt-1">
              <li className="p-2.5 bg-white border border-[#E2E8F0] rounded">
                <strong className="text-[#1E293B] block mb-1">MAE (Mean Absolute Error):</strong>
                Direct expected physical error in students or kilograms per meal. A lower MAE means tighter batch portioning.
              </li>
              <li className="p-2.5 bg-white border border-[#E2E8F0] rounded">
                <strong className="text-[#1E293B] block mb-1">RMSE (Root Mean Square):</strong>
                Heavily penalizes occasional large forecasting misses. Closeness of RMSE to MAE proves errors are uniform without severe spikes.
              </li>
              <li className="p-2.5 bg-white border border-[#E2E8F0] rounded">
                <strong className="text-[#1E293B] block mb-1">R² (Variance Explained):</strong>
                Proportion of turnout variance captured by contextual features. High R² values (0.85 to 0.94) indicate strong real-world predictive validity.
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* SECTION 3: Features & Data Dictionary */}
      {(activeTab === 'all' || activeTab === 'features') && (
        <section aria-labelledby="features-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-3">
            <div>
              <h2 id="features-heading" className="text-base font-semibold text-[#1E293B] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
                <span>Feature Dictionary & Operational Roles ({info.features.length} Features)</span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Explicit mapping of contextual inputs to operational mess dining dynamics.
              </p>
            </div>

            {/* Feature Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search features..."
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                aria-label="Filter feature dictionary"
              />
            </div>
          </div>

          <div className="border border-[#E2E8F0] rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#475569] border-b border-[#E2E8F0]">
                <tr>
                  <th scope="col" className="p-3 font-semibold">Feature Name</th>
                  <th scope="col" className="p-3 font-semibold">Data Type</th>
                  <th scope="col" className="p-3 font-semibold">Derivation</th>
                  <th scope="col" className="p-3 font-semibold">Dining Hall Operational Role</th>
                  <th scope="col" className="p-3 font-semibold">Options / Domain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredFeatures.map((feat) => {
                  const detail = info.feature_details?.[feat];
                  const isNum = info.numeric_features.includes(feat);
                  return (
                    <tr key={feat} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="p-3 font-mono font-semibold text-[#1E293B]">
                        {feat}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isNum ? 'bg-amber-50 text-[#B45309] border border-amber-200' : 'bg-blue-50 text-[#2563EB] border border-blue-200'
                        }`}>
                          {detail?.type || (isNum ? 'Numeric' : 'Categorical')}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-[#64748B]">
                        {detail?.derived ? (
                          <span className="text-[#15803D] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Auto from Date
                          </span>
                        ) : (
                          'Manager Input'
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-[#334155] max-w-xs leading-relaxed">
                        {detail?.role || 'Input feature utilized by the ExtraTrees ensemble.'}
                      </td>
                      <td className="p-3 text-[11px] text-[#64748B] font-mono">
                        {detail?.options || 'Standard categories'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECTION 4: Domain Safeguards & Invariant Guarantees */}
      {(activeTab === 'all' || activeTab === 'safeguards') && (
        <section aria-labelledby="safeguards-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 id="safeguards-heading" className="text-base font-semibold text-[#1E293B] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#15803D]" aria-hidden="true" />
                <span>Physical Invariants & Domain Safeguards</span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Post-inference boundary clamps enforced by the software backend to ensure zero nonsensical outputs.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-[#15803D] border border-emerald-200 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active in API
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(info.domain_safeguards || [
              {
                rule: '0 <= expected_students <= mess_capacity_students',
                target: 'expected_students',
                purpose: 'Prevents negative student turnout and caps headcount to the hostel physical seating capacity (556).',
                type: 'Physical Occupancy Invariant',
              },
              {
                rule: 'expected_food_required_kg >= 0.0',
                target: 'expected_food_required_kg',
                purpose: 'Batch cooking volume cannot be mathematically negative under any outlier edge cases.',
                type: 'Non-Negative Batch Invariant',
              },
              {
                rule: '0.0 <= expected_food_wastage_kg <= expected_food_required_kg',
                target: 'expected_food_wastage_kg',
                purpose: 'Conservation of mass: unconsumed food leftovers cannot exceed the total meal volume prepared.',
                type: 'Mass Conservation Invariant',
              },
            ]).map((sg, idx) => (
              <div key={idx} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#15803D] uppercase tracking-wider">
                    {sg.type}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                </div>
                <code className="text-xs font-mono font-bold text-[#1E293B] bg-white p-2 border border-[#E2E8F0] rounded block overflow-x-auto">
                  {sg.rule}
                </code>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  {sg.purpose}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5: Interactive Scenario Sandbox */}
      {(activeTab === 'all' || activeTab === 'sandbox') && (
        <section
          id="interactive-sandbox"
          aria-labelledby="sandbox-heading"
          className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB]" />
                <h2 id="sandbox-heading" className="text-base font-semibold text-[#1E293B]">
                  Interactive Model Inference Simulator & Inspector
                </h2>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Test how context switches alter model predictions in real time. Runs live inference without modifying history.
              </p>
            </div>
            <Badge variant="info">Live Backend Testbed</Badge>
          </div>

          <form onSubmit={handleRunSandbox} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Date */}
              <div>
                <label htmlFor="sandbox-date" className="font-semibold text-[#334155] block mb-1">
                  Calendar Date
                </label>
                <input
                  id="sandbox-date"
                  type="date"
                  value={sandboxDate}
                  onChange={(e) => setSandboxDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  required
                />
                <span className="text-[11px] text-[#64748B] mt-1 block">
                  {derivedDay} &bull; {isWeekend ? 'Weekend' : 'Weekday'}
                </span>
              </div>

              {/* Meal Type */}
              <div>
                <label htmlFor="sandbox-meal" className="font-semibold text-[#334155] block mb-1">
                  Meal Slot
                </label>
                <select
                  id="sandbox-meal"
                  value={sandboxMeal}
                  onChange={(e) => setSandboxMeal(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              {/* Special Meal */}
              <div>
                <label htmlFor="sandbox-special" className="font-semibold text-[#334155] block mb-1">
                  Special Feast Meal?
                </label>
                <select
                  id="sandbox-special"
                  value={sandboxSpecial}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSandboxSpecial(val);
                    if (val === 'Yes') {
                      setSandboxMenu('Special');
                    }
                  }}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <option value="No">No (Standard Meal)</option>
                  <option value="Yes">Yes (Festival Feast)</option>
                </select>
              </div>

              {/* Weather */}
              <div>
                <label htmlFor="sandbox-weather" className="font-semibold text-[#334155] block mb-1">
                  Weather Condition
                </label>
                <select
                  id="sandbox-weather"
                  value={sandboxWeather}
                  onChange={(e) => setSandboxWeather(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <option value="Clear">Clear</option>
                  <option value="Rainy">Rainy</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
            </div>

            {/* Context Toggles Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-2">
              <label className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={sandboxHoliday}
                  onChange={(e) => setSandboxHoliday(e.target.checked)}
                  className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-[#1E293B] font-medium">Holiday Today</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={sandboxExam}
                  onChange={(e) => setSandboxExam(e.target.checked)}
                  className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-[#1E293B] font-medium">Exam on Day</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={sandboxEvent}
                  onChange={(e) => setSandboxEvent(e.target.checked)}
                  className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-[#1E293B] font-medium">College Event</span>
              </label>

              <div>
                <label htmlFor="sandbox-cap" className="text-[11px] font-semibold text-[#475569] block mb-1">
                  Target Capacity (Seats)
                </label>
                <input
                  id="sandbox-cap"
                  type="number"
                  min="1"
                  max="5000"
                  value={sandboxCapacity}
                  onChange={(e) => setSandboxCapacity(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                />
              </div>
            </div>

            {/* Menu Items Input */}
            <div className="text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label htmlFor="sandbox-menu" className="font-semibold text-[#334155]">
                  Main Menu Items
                </label>
                <div className="flex items-center gap-2">
                  {sandboxSpecial === 'Yes' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-[#B45309] border border-amber-200">
                      <Sparkles className="w-3 h-3" /> Special feast: set to "Special"
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-[#2563EB] border border-blue-200">
                      <CheckCircle2 className="w-3 h-3" /> Auto-decided for {derivedDay} {sandboxMeal}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const autoM = getAutoDecidedMenu(derivedDay, sandboxMeal, sandboxSpecial);
                      if (autoM) setSandboxMenu(autoM);
                    }}
                    className="px-2 py-0.5 text-[10px] font-medium text-[#475569] bg-[#F8FAFC] border border-[#CBD5E1] rounded hover:bg-white"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <input
                id="sandbox-menu"
                type="text"
                value={sandboxMenu}
                onChange={(e) => setSandboxMenu(e.target.value)}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                placeholder="Auto-decided based on date and meal slot (or type custom menu)"
                required
              />
            </div>


            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#64748B]">
                Simulates real-time ExtraTrees inference through FastAPI service.
              </span>
              <button
                type="submit"
                disabled={sandboxLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
              >
                {sandboxLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Model Simulation</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sandbox Error State */}
          {sandboxError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
              <strong>Simulation Error:</strong> {sandboxError}
            </div>
          )}

          {/* Sandbox Results Display */}
          {sandboxResult && (
            <div className="p-5 bg-[#F8FAFC] border border-blue-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                  Simulation Output & Invariant Checks
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Capacity Ceiling: {sandboxCapacity}
                </span>
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs">
                  <span className="text-[11px] text-[#64748B] block">Expected Turnout</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-[#1E293B]">
                      {sandboxResult.expected_students}
                    </span>
                    <span className="text-xs text-[#64748B]">students</span>
                  </div>
                  <span className="text-[10px] text-[#64748B] block mt-1">
                    {((sandboxResult.expected_students / sandboxCapacity) * 100).toFixed(1)}% of mess capacity
                  </span>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs">
                  <span className="text-[11px] text-[#64748B] block">Food Required</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-[#1E293B]">
                      {sandboxResult.expected_food_required_kg}
                    </span>
                    <span className="text-xs text-[#64748B]">kg</span>
                  </div>
                  <span className="text-[10px] text-[#64748B] block mt-1">
                    ~{sandboxResult.food_per_student_kg} kg per attendee
                  </span>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs">
                  <span className="text-[11px] text-[#64748B] block">Expected Wastage</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-[#B45309]">
                      {sandboxResult.expected_food_wastage_kg}
                    </span>
                    <span className="text-xs text-[#64748B]">kg</span>
                  </div>
                  <span className="text-[10px] text-[#B45309] font-medium block mt-1">
                    {sandboxResult.waste_percentage}% of total prepared food
                  </span>
                </div>
              </div>

              {/* Comparison & Safeguards Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-2">
                <h4 className="font-semibold text-[#1E293B] text-[11px] uppercase tracking-wider">
                  Raw Estimator Output vs. Domain Clamped Output
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#475569]">
                  <div className="p-2 bg-[#F8FAFC] rounded">
                    <span className="text-[#64748B] block">Raw Students:</span>
                    <strong className="text-[#1E293B]">{sandboxResult.raw_expected_students}</strong>
                  </div>
                  <div className="p-2 bg-[#F8FAFC] rounded">
                    <span className="text-[#64748B] block">Raw Food Required:</span>
                    <strong className="text-[#1E293B]">{sandboxResult.raw_expected_food_required_kg} kg</strong>
                  </div>
                  <div className="p-2 bg-[#F8FAFC] rounded">
                    <span className="text-[#64748B] block">Raw Wastage:</span>
                    <strong className="text-[#1E293B]">{sandboxResult.raw_expected_food_wastage_kg} kg</strong>
                  </div>
                </div>

                {sandboxResult.safeguards_triggered.length > 0 ? (
                  <div className="p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded text-[11px] text-[#B45309]">
                    <strong>Safeguards Triggered:</strong>
                    <ul className="list-disc list-inside mt-0.5">
                      {sandboxResult.safeguards_triggered.map((sg, i) => (
                        <li key={i}>{sg}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#15803D] flex items-center gap-1 font-medium pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All 3 physical domain boundary checks satisfied without clamping intervention.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
