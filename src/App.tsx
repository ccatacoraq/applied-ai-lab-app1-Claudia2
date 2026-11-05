/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  DEFAULT_SALES_CSV,
  MULTI_YEAR_SALES_CSV,
  parseSalesCSV,
  analyzeSalesOrders,
  computeYoYAnalytics,
  formatCurrency,
  formatSignedCurrency,
  formatSignedPct,
  SalesOrderRow,
  DataCleaningReport,
} from './utils/salesAnalytics';

const EMEA_SURGE_CSV = `quarter,region,channel,product,units,discount_pct,revenue
Q1,EMEA,Enterprise Direct,Cloud Ledger Pro,310,7.0,115320
q1,emea,Partner Reseller,Analytics Core,240,9.0,65520
Q1,North America,Enterprise Direct,Cloud Ledger Pro,450,5.0,171000
Q1,north america,Partner Reseller,Analytics Core,320,7.5,88800
Q1,APAC,Partner Reseller,Cloud Ledger Pro,210,8.0,77280
Q1,LATAM,Self-Serve Web,RevOps Suite,130,5.0,24700
Q2,EMEA,Enterprise Direct,Cloud Ledger Pro,330,8.0,121440
Q2,emea ,partner reseller,Analytics Core,250,10.0,67500
Q2,EMEA,Self-Serve Web,RevOps Suite,140,6.0,26320
Q2,North America,Enterprise Direct,Cloud Ledger Pro,470,5.0,178600
Q2,North America,Partner Reseller,Analytics Core,340,7.0,94860
Q2,APAC,Partner Reseller,Cloud Ledger Pro,240,7.5,88800
Q2,apac,Self-Serve Web,Analytics Core,160,4.0,46080
Q2,LATAM,Partner Reseller,Analytics Core,155,10.0,41850
Q3,EMEA,Enterprise Direct,Cloud Ledger Pro,640,2.5,249600
Q3,emea,Enterprise Direct,RevOps Suite,290,2.0,56840
Q3,EMEA,Partner Reseller,Analytics Core,420,4.0,120960
Q3,EMEA ,self-serve web,RevOps Suite,210,3.0,40740
Q3,North America,Enterprise Direct,Cloud Ledger Pro,490,4.5,187180
Q3,North America,Partner Reseller,Analytics Core,355,6.5,99577.5
Q3,APAC,Partner Reseller,Cloud Ledger Pro,265,6.0,99640
Q3,APAC,Self-Serve Web,Analytics Core,175,3.5,50662.5
Q3,LATAM,Partner Reseller,Analytics Core,140,12.0,36960
Q4,EMEA,Enterprise Direct,Cloud Ledger Pro,660,3.0,256080
Q4,EMEA,Partner Reseller,Analytics Core,435,4.5,124627.5
Q4,North America,Enterprise Direct,Cloud Ledger Pro,515,4.0,197760
Q4,APAC,Partner Reseller,Cloud Ledger Pro,280,5.5,105840
Q4,LATAM,Partner Reseller,Analytics Core,165,9.5,44797.5`;

const REGION_PALETTE: Record<string, string> = {
  West: '#0F172A',
  East: '#2563EB',
  Central: '#0D9488',
  South: '#D97706',
  'North America': '#0F172A',
  EMEA: '#2563EB',
  APAC: '#0D9488',
  LATAM: '#D97706',
};

const FALLBACK_COLORS = ['#0F172A', '#2563EB', '#0D9488', '#D97706', '#4F46E5', '#BE123C'];

function getRegionColor(region: string, idx: number): string {
  return REGION_PALETTE[region] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialParsed = useMemo(() => parseSalesCSV(DEFAULT_SALES_CSV), []);

  const [datasetName, setDatasetName] = useState<string>('default_sales_orders_2026.csv');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<SalesOrderRow[]>(initialParsed.rows);
  const [cleaningReport, setCleaningReport] = useState<DataCleaningReport>(
    initialParsed.cleaningReport
  );
  const [showCleaningDetails, setShowCleaningDetails] = useState<boolean>(false);

  // Selected Year Filter for Quarterly and AI attribution analysis
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Chart and view modes
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');
  const [highlightQ2Q3, setHighlightQ2Q3] = useState<boolean>(true);
  const [selectedInspectRegion, setSelectedInspectRegion] = useState<string>('');

  // YoY Specific Selection
  const [yoyBaseYear, setYoyBaseYear] = useState<string>('');
  const [yoyComparisonYear, setYoyComparisonYear] = useState<string>('');

  // Order Ledger Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quarterFilter, setQuarterFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [ledgerYearFilter, setLedgerYearFilter] = useState<string>('ALL');

  // Analytics computation
  const analytics = useMemo(() => {
    return analyzeSalesOrders(allOrders, selectedYear);
  }, [allOrders, selectedYear]);

  // Overall YoY result based on all orders
  const yoyAnalytics = useMemo(() => {
    return computeYoYAnalytics(allOrders, yoyBaseYear || undefined, yoyComparisonYear || undefined);
  }, [allOrders, yoyBaseYear, yoyComparisonYear]);

  // Update inspect region when analytics top changed region changes
  useEffect(() => {
    if (analytics.topChangedRegion) {
      setSelectedInspectRegion(analytics.topChangedRegion.region);
    }
  }, [analytics.topChangedRegion]);

  // Sync YoY base and comparison year defaults when years change
  useEffect(() => {
    if (yoyAnalytics?.hasMultipleYears) {
      if (!yoyBaseYear || !yoyAnalytics.years.includes(yoyBaseYear)) {
        setYoyBaseYear(yoyAnalytics.baseYear);
      }
      if (!yoyComparisonYear || !yoyAnalytics.years.includes(yoyComparisonYear)) {
        setYoyComparisonYear(yoyAnalytics.comparisonYear);
      }
    }
  }, [yoyAnalytics, yoyBaseYear, yoyComparisonYear]);

  const handleCSVTextLoad = (csvText: string, fileName: string) => {
    const { rows, error, cleaningReport: report } = parseSalesCSV(csvText);
    if (error) {
      setCsvError(error);
      return;
    }
    setCsvError(null);
    setDatasetName(fileName);
    setAllOrders(rows);
    setCleaningReport(report);
    setSelectedYear('ALL');
    setQuarterFilter('ALL');
    setRegionFilter('ALL');
    setLedgerYearFilter('ALL');
    setYoyBaseYear('');
    setYoyComparisonYear('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        handleCSVTextLoad(content, file.name);
      }
    };
    reader.onerror = () => {
      setCsvError('Failed to read the selected CSV file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        handleCSVTextLoad(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCSV = () => {
    const blob = new Blob([MULTI_YEAR_SALES_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_multi_year_sales_orders.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inspectedRegionComparison = useMemo(() => {
    return (
      analytics.regionComparisons.find((r) => r.region === selectedInspectRegion) ||
      analytics.topChangedRegion
    );
  }, [analytics.regionComparisons, analytics.topChangedRegion, selectedInspectRegion]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter((row) => {
      if (ledgerYearFilter !== 'ALL' && row.year !== ledgerYearFilter) return false;
      if (quarterFilter !== 'ALL' && row.quarter !== quarterFilter) return false;
      if (regionFilter !== 'ALL' && row.region !== regionFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          row.region.toLowerCase().includes(q) ||
          row.channel.toLowerCase().includes(q) ||
          row.product.toLowerCase().includes(q) ||
          row.quarter.toLowerCase().includes(q) ||
          (row.year && row.year.includes(q))
        );
      }
      return true;
    });
  }, [allOrders, ledgerYearFilter, quarterFilter, regionFilter, searchQuery]);

  // Chart geometry calculations
  const maxGroupedValue = useMemo(() => {
    let max = 0;
    for (const r of analytics.regions) {
      for (const q of analytics.quarters) {
        const val = analytics.matrix[r]?.[q] || 0;
        if (val > max) max = val;
      }
    }
    return max > 0 ? max * 1.12 : 100000;
  }, [analytics]);

  const maxStackedValue = useMemo(() => {
    let max = 0;
    for (const q of analytics.quarters) {
      const val = analytics.quarterTotals[q] || 0;
      if (val > max) max = val;
    }
    return max > 0 ? max * 1.12 : 100000;
  }, [analytics]);

  const distinctYearsInDataset = analytics.years;
  const hasMultipleYears = Boolean(yoyAnalytics?.hasMultipleYears);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#overview"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          RevLens
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#overview"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Overview
          </a>
          {hasMultipleYears && (
            <a
              href="#yoy-comparison"
              className="text-slate-900 font-semibold hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>YoY Analysis</span>
            </a>
          )}
          <a
            href="#revenue-matrix"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Revenue Matrix
          </a>
          <a
            href="#raw-orders"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Order Ledger
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Sales CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8 space-y-10">
        {/* Section 1: Overview & CSV Upload Bar */}
        <section id="overview" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Quarterly Sales Order Intelligence</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{datasetName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{allOrders.length} orders</span>
                {distinctYearsInDataset.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-700">
                      Years: {distinctYearsInDataset.join(', ')}
                    </span>
                  </>
                )}
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
                style={{ textWrap: 'balance' }}
              >
                Regional Revenue &amp; Quarterly Analytics
              </h1>
            </div>

            {/* Dataset Switcher & CSV Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleCSVTextLoad(MULTI_YEAR_SALES_CSV, 'multi_year_sales_2025_2026.csv')
                }
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  datasetName === 'multi_year_sales_2025_2026.csv'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Preset 1: Multi-Year YoY (2025 vs 2026)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCSVTextLoad(DEFAULT_SALES_CSV, 'default_sales_orders_2026.csv')
                }
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  datasetName === 'default_sales_orders_2026.csv'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Preset 2: West Q3 Surge
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCSVTextLoad(EMEA_SURGE_CSV, 'emea_expansion_orders_2026.csv')
                }
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  datasetName === 'emea_expansion_orders_2026.csv'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Preset 3: EMEA Surge
              </button>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample CSV</span>
              </button>
            </div>
          </div>

          {/* CSV Dropzone & Schema Bar */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-dashed border-slate-300 rounded-lg p-4 hover:border-slate-500 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-900">
                  Drop a sales orders CSV file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  Columns supported:{' '}
                  <code className="font-mono text-slate-700">
                    quarter, region, channel, product, units, discount_pct, revenue
                  </code>{' '}
                  + optional <code className="font-mono text-slate-700">year</code> column (or compound quarter like &quot;2025 Q1&quot;).
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-700 underline underline-offset-4 whitespace-nowrap shrink-0">
              Select CSV File
            </span>
          </div>

          {/* Automated Data Hygiene & Normalization Report */}
          {cleaningReport.totalCellsCleaned > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-900">
                    Automated Text Hygiene Applied
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Normalized {cleaningReport.totalCellsCleaned} text value
                    {cleaningReport.totalCellsCleaned === 1 ? '' : 's'} across{' '}
                    {cleaningReport.totalRowsCleaned} row
                    {cleaningReport.totalRowsCleaned === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCleaningDetails((prev) => !prev)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showCleaningDetails ? 'Hide Cleaned Variants' : 'Show Cleaned Variants'}
                </button>
              </div>

              {showCleaningDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                  {cleaningReport.mappings.map((m) => (
                    <div
                      key={`${m.column}-${m.canonicalValue}`}
                      className="flex items-baseline justify-between gap-2 py-1 px-2.5 bg-slate-50 rounded text-slate-700"
                    >
                      <div className="truncate">
                        <span className="font-mono text-slate-500">{m.column}:</span>{' '}
                        <span className="font-mono text-slate-600">
                          {m.rawVariants.join(', ')}
                        </span>{' '}
                        <span aria-hidden="true">→</span>{' '}
                        <span className="font-semibold text-slate-900">
                          &quot;{m.canonicalValue}&quot;
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-slate-500 shrink-0">
                        {m.affectedRows}r
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {csvError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">CSV Validation Error</p>
                <p className="text-xs mt-0.5">{csvError}</p>
              </div>
            </div>
          )}

          {/* Top-Level Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-500">
                Total Revenue {selectedYear !== 'ALL' ? `(${selectedYear})` : '(All Years)'}
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatCurrency(analytics.grandTotalRevenue)}
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {analytics.regions.length} canonical regions · {analytics.quarters.length} quarters
              </p>
            </div>

            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-500">
                Total Units {selectedYear !== 'ALL' ? `(${selectedYear})` : ''}
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {analytics.totalUnits.toLocaleString('en-US')}
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Avg discount: {analytics.avgDiscountPct.toFixed(2)}%
              </p>
            </div>

            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-500">Largest Q2 → Q3 Swing Region</p>
              <p className="text-2xl font-bold text-slate-900 truncate">
                {analytics.topChangedRegion ? analytics.topChangedRegion.region : '—'}
              </p>
              {analytics.topChangedRegion && (
                <p className="text-xs font-mono tabular-nums text-emerald-700 flex items-center gap-1">
                  {analytics.topChangedRegion.revenueDelta >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>
                    {formatSignedCurrency(analytics.topChangedRegion.revenueDelta)} (
                    {formatSignedPct(analytics.topChangedRegion.revenuePctChange)})
                  </span>
                </p>
              )}
            </div>

            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-500">
                {hasMultipleYears ? 'Company Year-over-Year Growth' : 'Q2 vs Q3 Revenue Change'}
              </p>
              {hasMultipleYears && yoyAnalytics ? (
                <>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatSignedCurrency(yoyAnalytics.companyRevenueDelta)}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-emerald-700 flex items-center gap-1">
                    {yoyAnalytics.companyRevenueDelta >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {formatSignedPct(yoyAnalytics.companyRevenuePctChange)} ({yoyAnalytics.baseYear} → {yoyAnalytics.comparisonYear})
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatSignedCurrency(
                      (analytics.quarterTotals['Q3'] || 0) -
                        (analytics.quarterTotals['Q2'] || 0)
                    )}
                  </p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    Q2 {formatCurrency(analytics.quarterTotals['Q2'] || 0)} → Q3{' '}
                    {formatCurrency(analytics.quarterTotals['Q3'] || 0)}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Section: Dedicated Year-over-Year (YoY) Revenue Comparison (When multiple years exist) */}
        {hasMultipleYears && yoyAnalytics && (
          <section id="yoy-comparison" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Multi-Year Dataset Detected</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500 font-normal">Annual Growth &amp; Variance Attribution</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Year-over-Year (YoY) Revenue Comparison ({yoyAnalytics.baseYear} vs {yoyAnalytics.comparisonYear})
                </h2>
              </div>

              {/* Year Selectors */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Base:</span>
                  <select
                    value={yoyAnalytics.baseYear}
                    onChange={(e) => setYoyBaseYear(e.target.value)}
                    aria-label="Select YoY Base Year"
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded font-mono text-slate-800 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    {yoyAnalytics.years.map((y) => (
                      <option key={y} value={y} disabled={y === yoyAnalytics.comparisonYear}>
                        {y}
                      </option>
                    ))}
                  </select>

                  <span className="mx-1 text-slate-400">vs</span>

                  <span>Compare:</span>
                  <select
                    value={yoyAnalytics.comparisonYear}
                    onChange={(e) => setYoyComparisonYear(e.target.value)}
                    aria-label="Select YoY Comparison Year"
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded font-mono text-slate-800 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    {yoyAnalytics.years.map((y) => (
                      <option key={y} value={y} disabled={y === yoyAnalytics.baseYear}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* YoY KPI Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="p-5 space-y-1">
                <p className="text-xs text-slate-500">
                  Company Total Revenue ({yoyAnalytics.baseYear} → {yoyAnalytics.comparisonYear})
                </p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {formatCurrency(yoyAnalytics.companyPriorRevenue)} → {formatCurrency(yoyAnalytics.companyCurrentRevenue)}
                </p>
                <p className="text-xs font-mono tabular-nums font-semibold text-emerald-700 flex items-center gap-1">
                  {yoyAnalytics.companyRevenueDelta >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {formatSignedCurrency(yoyAnalytics.companyRevenueDelta)} ({formatSignedPct(yoyAnalytics.companyRevenuePctChange)})
                  </span>
                </p>
              </div>

              <div className="p-5 space-y-1">
                <p className="text-xs text-slate-500">
                  Total Volume ({yoyAnalytics.baseYear} → {yoyAnalytics.comparisonYear})
                </p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {yoyAnalytics.companyPriorUnits.toLocaleString()} → {yoyAnalytics.companyCurrentUnits.toLocaleString()} units
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-600">
                  Delta: {yoyAnalytics.companyUnitsDelta > 0 ? '+' : ''}{yoyAnalytics.companyUnitsDelta.toLocaleString()} units ({formatSignedPct(yoyAnalytics.companyUnitsPctChange)})
                </p>
              </div>

              <div className="p-5 space-y-1">
                <p className="text-xs text-slate-500">Top Growth Region (YoY)</p>
                <p className="text-lg font-bold text-slate-900 truncate">
                  {yoyAnalytics.topYoYRegion ? yoyAnalytics.topYoYRegion.region : '—'}
                </p>
                {yoyAnalytics.topYoYRegion && (
                  <p className="text-xs font-mono tabular-nums text-emerald-700">
                    {formatSignedCurrency(yoyAnalytics.topYoYRegion.revenueDelta)} ({formatSignedPct(yoyAnalytics.topYoYRegion.revenuePctChange)})
                  </p>
                )}
              </div>
            </div>

            {/* YoY Regional Comparison Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Regional Year-over-Year Revenue &amp; Quarterly Pacing
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Base: {yoyAnalytics.baseYear} · Current: {yoyAnalytics.comparisonYear}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-5">Region</th>
                      <th className="py-3 px-4 text-right font-mono">{yoyAnalytics.baseYear} Revenue</th>
                      <th className="py-3 px-4 text-right font-mono">{yoyAnalytics.comparisonYear} Revenue</th>
                      <th className="py-3 px-4 text-right font-mono bg-blue-50/50 text-slate-900">YoY Change ($)</th>
                      <th className="py-3 px-4 text-right font-mono bg-blue-50/50 text-slate-900">YoY Change (%)</th>
                      <th className="py-3 px-4 text-right font-mono">Q1 YoY</th>
                      <th className="py-3 px-4 text-right font-mono">Q2 YoY</th>
                      <th className="py-3 px-4 text-right font-mono">Q3 YoY</th>
                      <th className="py-3 px-5 text-right font-mono">Q4 YoY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {yoyAnalytics.regionYoY.map((reg, idx) => (
                      <tr key={reg.region} className="hover:bg-slate-50">
                        <td className="py-3 px-5 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: getRegionColor(reg.region, idx) }}
                            />
                            <span>{reg.region}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(reg.priorYearRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(reg.currentYearRevenue)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            reg.revenueDelta > 0
                              ? 'text-emerald-700'
                              : reg.revenueDelta < 0
                              ? 'text-red-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatSignedCurrency(reg.revenueDelta)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            (reg.revenueDelta || 0) > 0
                              ? 'text-emerald-700'
                              : (reg.revenueDelta || 0) < 0
                              ? 'text-red-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatSignedPct(reg.revenuePctChange)}
                        </td>

                        {/* Quarterly YoY deltas */}
                        {reg.quarterlyBreakdown.map((q) => (
                          <td
                            key={q.quarter}
                            className={`py-3 px-4 text-right font-mono tabular-nums text-xs ${
                              q.revenueDelta > 0
                                ? 'text-emerald-700'
                                : q.revenueDelta < 0
                                ? 'text-red-700'
                                : 'text-slate-500'
                            }`}
                          >
                            <span>{formatSignedCurrency(q.revenueDelta)}</span>
                            <span className="block text-[10px] text-slate-400">
                              {formatSignedPct(q.revenuePctChange)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-sm text-slate-900">
                      <td className="py-3.5 px-5">Total (Company)</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(yoyAnalytics.companyPriorRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(yoyAnalytics.companyCurrentRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                        {formatSignedCurrency(yoyAnalytics.companyRevenueDelta)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                        {formatSignedPct(yoyAnalytics.companyRevenuePctChange)}
                      </td>
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                        const priorTotal = yoyAnalytics.matrixByQuarterAndYear[q]?.[yoyAnalytics.baseYear] || 0;
                        const currTotal = yoyAnalytics.matrixByQuarterAndYear[q]?.[yoyAnalytics.comparisonYear] || 0;
                        const delta = currTotal - priorTotal;
                        const pct = priorTotal > 0 ? (delta / priorTotal) * 100 : null;
                        return (
                          <td key={q} className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                            <span className={delta >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                              {formatSignedCurrency(delta)}
                            </span>
                            <span className="block text-[10px] text-slate-500 font-normal">
                              {formatSignedPct(pct)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        )}



        {/* Section 3: Total Revenue by Region and Quarter (Chart & Pivot Table) */}
        <section id="revenue-matrix" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Primary Visualization &amp; Pivot Table</span>
                <span aria-hidden="true">·</span>
                <span>Grouped by Canonical Region &amp; Quarter</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Total Revenue by Region and Quarter
              </h2>
            </div>

            {/* Interactive Chart Controls & Year Filtering */}
            <div className="flex flex-wrap items-center gap-3">
              {distinctYearsInDataset.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-medium">Filter Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    aria-label="Filter Matrix Year"
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded font-mono text-slate-800 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    <option value="ALL">All Years Combined</option>
                    {distinctYearsInDataset.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setHighlightQ2Q3((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  highlightQ2Q3
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Highlight Q2 → Q3 Window
              </button>

              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartMode('grouped')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Grouped by Quarter
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('stacked')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMode === 'stacked'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Stacked Total
                </button>
              </div>
            </div>
          </div>

          {/* Chart Surface */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5">
                {analytics.regions.map((region, idx) => (
                  <div key={region} className="flex items-center gap-2 text-xs text-slate-700">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: getRegionColor(region, idx) }}
                    />
                    <span className="font-medium">{region}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      ({formatCurrency(analytics.regionTotals[region] || 0)})
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Values in USD ($) {selectedYear !== 'ALL' ? `· Scope: ${selectedYear}` : ''}
              </span>
            </div>

            {/* Responsive SVG Bar Chart */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[680px]">
                {chartMode === 'grouped' ? (
                  <svg
                    viewBox="0 0 920 340"
                    className="w-full h-auto select-none"
                    role="img"
                    aria-label="Grouped bar chart of total revenue by region and quarter"
                  >
                    {/* Y-axis gridlines & labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = 280 - ratio * 230;
                      const val = maxGroupedValue * ratio;
                      return (
                        <g key={i}>
                          <line
                            x1={85}
                            y1={y}
                            x2={890}
                            y2={y}
                            stroke={ratio === 0 ? '#CBD5E1' : '#F1F5F9'}
                            strokeWidth={1}
                          />
                          <text
                            x={75}
                            y={y + 4}
                            textAnchor="end"
                            className="text-[11px] fill-slate-500 font-mono"
                          >
                            ${Math.round(val / 1000).toLocaleString()}k
                          </text>
                        </g>
                      );
                    })}

                    {/* Quarter Groups */}
                    {analytics.quarters.map((quarter, qIdx) => {
                      const groupCount = analytics.quarters.length;
                      const plotWidth = 805;
                      const groupWidth = plotWidth / groupCount;
                      const groupStartX = 85 + qIdx * groupWidth;
                      const isQ2OrQ3 =
                        quarter.toUpperCase() === 'Q2' || quarter.toUpperCase() === 'Q3';

                      const barAreaWidth = groupWidth * 0.72;
                      const barStartOffset = (groupWidth - barAreaWidth) / 2;
                      const regionCount = Math.max(analytics.regions.length, 1);
                      const singleBarWidth = Math.min(
                        38,
                        (barAreaWidth - (regionCount - 1) * 6) / regionCount
                      );
                      const totalBarsWidth =
                        regionCount * singleBarWidth + (regionCount - 1) * 6;
                      const firstBarX =
                        groupStartX + barStartOffset + (barAreaWidth - totalBarsWidth) / 2;

                      return (
                        <g key={quarter}>
                          {/* Q2-Q3 Highlight Backdrop */}
                          {highlightQ2Q3 && isQ2OrQ3 && (
                            <rect
                              x={groupStartX + 6}
                              y={35}
                              width={groupWidth - 12}
                              height={245}
                              rx={6}
                              fill="#F8FAFC"
                              stroke="#E2E8F0"
                              strokeDasharray="4 4"
                            />
                          )}

                          {/* Bars per region */}
                          {analytics.regions.map((region, rIdx) => {
                            const val = analytics.matrix[region]?.[quarter] || 0;
                            const barHeight = Math.max(
                              (val / maxGroupedValue) * 230,
                              val > 0 ? 2 : 0
                            );
                            const x = firstBarX + rIdx * (singleBarWidth + 6);
                            const y = 280 - barHeight;
                            const color = getRegionColor(region, rIdx);

                            return (
                              <g key={region}>
                                <rect
                                  x={x}
                                  y={y}
                                  width={singleBarWidth}
                                  height={barHeight}
                                  rx={3}
                                  fill={color}
                                >
                                  <title>
                                    {`${quarter} · ${region}: ${formatCurrency(val)}`}
                                  </title>
                                </rect>
                                {val > 0 && singleBarWidth >= 24 && (
                                  <text
                                    x={x + singleBarWidth / 2}
                                    y={y - 6}
                                    textAnchor="middle"
                                    className="text-[10px] fill-slate-600 font-mono"
                                  >
                                    ${Math.round(val / 1000)}k
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Quarter Label */}
                          <text
                            x={groupStartX + groupWidth / 2}
                            y={304}
                            textAnchor="middle"
                            className="text-xs font-bold fill-slate-800"
                          >
                            {quarter}
                          </text>
                          <text
                            x={groupStartX + groupWidth / 2}
                            y={322}
                            textAnchor="middle"
                            className="text-[11px] fill-slate-500 font-mono"
                          >
                            {formatCurrency(analytics.quarterTotals[quarter] || 0)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 920 340"
                    className="w-full h-auto select-none"
                    role="img"
                    aria-label="Stacked bar chart of total revenue by region and quarter"
                  >
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = 280 - ratio * 230;
                      const val = maxStackedValue * ratio;
                      return (
                        <g key={i}>
                          <line
                            x1={85}
                            y1={y}
                            x2={890}
                            y2={y}
                            stroke={ratio === 0 ? '#CBD5E1' : '#F1F5F9'}
                            strokeWidth={1}
                          />
                          <text
                            x={75}
                            y={y + 4}
                            textAnchor="end"
                            className="text-[11px] fill-slate-500 font-mono"
                          >
                            ${Math.round(val / 1000).toLocaleString()}k
                          </text>
                        </g>
                      );
                    })}

                    {analytics.quarters.map((quarter, qIdx) => {
                      const groupCount = analytics.quarters.length;
                      const plotWidth = 805;
                      const groupWidth = plotWidth / groupCount;
                      const groupStartX = 85 + qIdx * groupWidth;
                      const barWidth = Math.min(84, groupWidth * 0.45);
                      const barX = groupStartX + (groupWidth - barWidth) / 2;

                      let cumulativeY = 280;

                      return (
                        <g key={quarter}>
                          {analytics.regions.map((region, rIdx) => {
                            const val = analytics.matrix[region]?.[quarter] || 0;
                            const segHeight = (val / maxStackedValue) * 230;
                            cumulativeY -= segHeight;
                            const color = getRegionColor(region, rIdx);

                            return (
                              <rect
                                key={region}
                                x={barX}
                                y={cumulativeY}
                                width={barWidth}
                                height={Math.max(segHeight, 0)}
                                fill={color}
                              >
                                <title>{`${quarter} · ${region}: ${formatCurrency(val)}`}</title>
                              </rect>
                            );
                          })}

                          <text
                            x={groupStartX + groupWidth / 2}
                            y={cumulativeY - 8}
                            textAnchor="middle"
                            className="text-[11px] font-semibold fill-slate-700 font-mono"
                          >
                            {formatCurrency(analytics.quarterTotals[quarter] || 0)}
                          </text>

                          <text
                            x={groupStartX + groupWidth / 2}
                            y={304}
                            textAnchor="middle"
                            className="text-xs font-bold fill-slate-800"
                          >
                            {quarter}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Pivot Table: Total Revenue by Region and Quarter */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Revenue Pivot Table by Region &amp; Quarter {selectedYear !== 'ALL' ? `(${selectedYear})` : ''}
              </h3>
              <span className="text-xs text-slate-500">
                Click any region row to inspect its Q2 → Q3 product and channel drivers below
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-5">Region</th>
                    {analytics.quarters.map((q) => (
                      <th
                        key={q}
                        className={`py-3 px-4 text-right font-mono ${
                          highlightQ2Q3 && (q === 'Q2' || q === 'Q3')
                            ? 'bg-slate-100/80 text-slate-900'
                            : ''
                        }`}
                      >
                        {q} Revenue
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right font-mono bg-slate-100/80 text-slate-900">
                      Q2 → Q3 Change ($)
                    </th>
                    <th className="py-3 px-4 text-right font-mono bg-slate-100/80 text-slate-900">
                      Q2 → Q3 Change (%)
                    </th>
                    <th className="py-3 px-5 text-right font-mono">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {analytics.regions.map((region, idx) => {
                    const comp = analytics.regionComparisons.find(
                      (c) => c.region === region
                    );
                    const isTopChanged =
                      analytics.topChangedRegion?.region === region;
                    const isSelected = selectedInspectRegion === region;

                    return (
                      <tr
                        key={region}
                        onClick={() => setSelectedInspectRegion(region)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100/90'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-5 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: getRegionColor(region, idx) }}
                            />
                            <span>{region}</span>
                            {isTopChanged && (
                              <span className="text-xs text-slate-500 font-normal">
                                · Largest Q2–Q3 Change
                              </span>
                            )}
                          </div>
                        </td>

                        {analytics.quarters.map((q) => (
                          <td
                            key={q}
                            className={`py-3 px-4 text-right font-mono tabular-nums text-slate-700 ${
                              highlightQ2Q3 && (q === 'Q2' || q === 'Q3')
                                ? 'bg-slate-50/80 font-medium text-slate-900'
                                : ''
                            }`}
                          >
                            {formatCurrency(analytics.matrix[region]?.[q] || 0)}
                          </td>
                        ))}

                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            (comp?.revenueDelta || 0) > 0
                              ? 'text-emerald-700'
                              : (comp?.revenueDelta || 0) < 0
                              ? 'text-red-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {comp ? formatSignedCurrency(comp.revenueDelta) : '—'}
                        </td>

                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums ${
                            (comp?.revenueDelta || 0) > 0
                              ? 'text-emerald-700'
                              : (comp?.revenueDelta || 0) < 0
                              ? 'text-red-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {comp ? formatSignedPct(comp.revenuePctChange) : '—'}
                        </td>

                        <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatCurrency(analytics.regionTotals[region] || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-sm text-slate-900">
                    <td className="py-3.5 px-5">Total (All Regions)</td>
                    {analytics.quarters.map((q) => (
                      <td
                        key={q}
                        className="py-3.5 px-4 text-right font-mono tabular-nums"
                      >
                        {formatCurrency(analytics.quarterTotals[q] || 0)}
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {formatSignedCurrency(
                        (analytics.quarterTotals['Q3'] || 0) -
                          (analytics.quarterTotals['Q2'] || 0)
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {formatSignedPct(
                        (analytics.quarterTotals['Q2'] || 0) > 0
                          ? (((analytics.quarterTotals['Q3'] || 0) -
                              (analytics.quarterTotals['Q2'] || 0)) /
                              (analytics.quarterTotals['Q2'] || 1)) *
                              100
                          : null
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums">
                      {formatCurrency(analytics.grandTotalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* Section 4: App-Calculated Underlying Q2-to-Q3 Drivers (Verifiable Proof Numbers) */}
        {inspectedRegionComparison && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Calculated Driver Breakdown</span>
                  <span aria-hidden="true">·</span>
                  <span>Exact Figures Provided to AI Summary</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Why {inspectedRegionComparison.region} Changed from Q2 to Q3
                </h2>
              </div>

              {/* Region Selector Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
                {analytics.regionComparisons.map((rc) => (
                  <button
                    key={rc.region}
                    type="button"
                    onClick={() => setSelectedInspectRegion(rc.region)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      inspectedRegionComparison.region === rc.region
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rc.region} ({formatSignedCurrency(rc.revenueDelta)})
                  </button>
                ))}
              </div>
            </div>

            {/* Volume, Discount & Realized Price Strip for Selected Region */}
            <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="p-5 space-y-1">
                <p className="text-xs text-slate-500">
                  {inspectedRegionComparison.region} Revenue (Q2 → Q3)
                </p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {formatCurrency(inspectedRegionComparison.q2Revenue)} →{' '}
                  {formatCurrency(inspectedRegionComparison.q3Revenue)}
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-600">
                  Delta: {formatSignedCurrency(inspectedRegionComparison.revenueDelta)} (
                  {formatSignedPct(inspectedRegionComparison.revenuePctChange)})
                </p>
              </div>

              <div className="p-5 space-y-1">
                <p className="text-xs text-slate-500">
                  {inspectedRegionComparison.region} Unit Volume (Q2 → Q3)
                </p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {inspectedRegionComparison.q2Units.toLocaleString()} →{' '}
                  {inspectedRegionComparison.q3Units.toLocaleString()} units
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-600">
                  Delta: {inspectedRegionComparison.unitsDelta > 0 ? '+' : ''}
                  {inspectedRegionComparison.unitsDelta.toLocaleString()} units (
                  {formatSignedPct(inspectedRegionComparison.unitsPctChange)})
                </p>
              </div>

              <div className="p-5 space-y-1">
                <p className="text-xs text-slate-500">
                  {inspectedRegionComparison.region} Avg Discount Rate (Q2 → Q3)
                </p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {inspectedRegionComparison.q2AvgDiscountPct.toFixed(2)}% →{' '}
                  {inspectedRegionComparison.q3AvgDiscountPct.toFixed(2)}%
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-600">
                  Shift:{' '}
                  {inspectedRegionComparison.discountPointDelta > 0 ? '+' : ''}
                  {inspectedRegionComparison.discountPointDelta.toFixed(2)} percentage
                  points
                </p>
              </div>
            </div>

            {/* Two-Column Breakdown: By Product and By Channel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Product Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Product Drivers ({inspectedRegionComparison.region}, Q2 vs Q3)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">By Product</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Product</th>
                        <th className="py-2.5 px-3 text-right font-mono">Q2 Rev</th>
                        <th className="py-2.5 px-3 text-right font-mono">Q3 Rev</th>
                        <th className="py-2.5 px-3 text-right font-mono">Delta ($)</th>
                        <th className="py-2.5 px-4 text-right font-mono">Units Δ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {inspectedRegionComparison.byProduct.map((prod) => (
                        <tr key={prod.name} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {prod.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatCurrency(prod.q2Revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatCurrency(prod.q3Revenue)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                              prod.revenueDelta >= 0
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {formatSignedCurrency(prod.revenueDelta)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                            {prod.unitsDelta > 0 ? '+' : ''}
                            {prod.unitsDelta} ({prod.q2Units}→{prod.q3Units})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Channel Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Channel Drivers ({inspectedRegionComparison.region}, Q2 vs Q3)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">By Channel</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Channel</th>
                        <th className="py-2.5 px-3 text-right font-mono">Q2 Rev</th>
                        <th className="py-2.5 px-3 text-right font-mono">Q3 Rev</th>
                        <th className="py-2.5 px-3 text-right font-mono">Delta ($)</th>
                        <th className="py-2.5 px-4 text-right font-mono">Avg Disc%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {inspectedRegionComparison.byChannel.map((chan) => (
                        <tr key={chan.name} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {chan.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatCurrency(chan.q2Revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatCurrency(chan.q3Revenue)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                              chan.revenueDelta >= 0
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {formatSignedCurrency(chan.revenueDelta)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                            {chan.q2AvgDiscountPct.toFixed(1)}%→
                            {chan.q3AvgDiscountPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: Raw Uploaded Sales Orders Ledger */}
        <section id="raw-orders" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-slate-900">
                Uploaded Sales Order Ledger (Normalized)
              </h2>
              <p className="text-xs text-slate-500">
                Showing {filteredOrders.length} of {allOrders.length} parsed rows · Original raw text shown when cleaned
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter product, channel, region..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 w-52"
                />
              </div>

              {distinctYearsInDataset.length > 0 && (
                <select
                  value={ledgerYearFilter}
                  onChange={(e) => setLedgerYearFilter(e.target.value)}
                  aria-label="Filter by Year"
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-900"
                >
                  <option value="ALL">All Years</option>
                  {distinctYearsInDataset.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={quarterFilter}
                onChange={(e) => setQuarterFilter(e.target.value)}
                aria-label="Filter by Quarter"
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">All Quarters</option>
                {analytics.quarters.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                aria-label="Filter by Region"
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">All Regions</option>
                {analytics.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    {distinctYearsInDataset.length > 0 && (
                      <th className="py-2.5 px-4 font-mono">year</th>
                    )}
                    <th className="py-2.5 px-4 font-mono">quarter</th>
                    <th className="py-2.5 px-4 font-mono">region</th>
                    <th className="py-2.5 px-4 font-mono">channel</th>
                    <th className="py-2.5 px-4 font-mono">product</th>
                    <th className="py-2.5 px-4 text-right font-mono">units</th>
                    <th className="py-2.5 px-4 text-right font-mono">discount_pct</th>
                    <th className="py-2.5 px-4 text-right font-mono">revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={distinctYearsInDataset.length > 0 ? 8 : 7}
                        className="py-8 text-center text-slate-500"
                      >
                        No sales orders match your current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        {distinctYearsInDataset.length > 0 && (
                          <td className="py-2.5 px-4 font-mono text-slate-600">
                            <span>{row.year || '—'}</span>
                            {row.cleanedFields?.year && (
                              <span className="ml-1 text-[10px] text-slate-400">
                                (&quot;{row.cleanedFields.year}&quot;)
                              </span>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-4 font-mono text-slate-800">
                          <span>{row.quarter}</span>
                          {row.cleanedFields?.quarter && (
                            <span className="ml-1.5 text-[11px] text-slate-400">
                              (raw: &quot;{row.cleanedFields.quarter}&quot;)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          <span>{row.region}</span>
                          {row.cleanedFields?.region && (
                            <span className="ml-1.5 font-mono font-normal text-[11px] text-slate-400">
                              (raw: &quot;{row.cleanedFields.region}&quot;)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          <span>{row.channel}</span>
                          {row.cleanedFields?.channel && (
                            <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                              (raw: &quot;{row.cleanedFields.channel}&quot;)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <span>{row.product}</span>
                          {row.cleanedFields?.product && (
                            <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                              (raw: &quot;{row.cleanedFields.product}&quot;)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.units.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.discount_pct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                          {formatCurrency(row.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>RevLens Quarterly &amp; Year-over-Year Sales Order Analytics</span>
          <span>
            Schema: quarter · region · channel · product · units · discount_pct · revenue (optional year)
          </span>
        </div>
      </footer>
    </div>
  );
}
