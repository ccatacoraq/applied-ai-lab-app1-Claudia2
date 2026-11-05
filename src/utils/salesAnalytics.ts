export interface SalesOrderRow {
  id: string;
  quarter: string; // E.g., 'Q1', 'Q2', 'Q3', 'Q4'
  year?: string; // E.g., '2025', '2026' (if detected or present)
  periodKey: string; // E.g., '2025 Q1' or 'Q1'
  region: string;
  channel: string;
  product: string;
  units: number;
  discount_pct: number;
  revenue: number;
  cleanedFields?: Partial<Record<'quarter' | 'year' | 'region' | 'channel' | 'product', string>>;
}

export interface NormalizationMapping {
  column: 'quarter' | 'year' | 'region' | 'channel' | 'product';
  canonicalValue: string;
  rawVariants: string[];
  affectedRows: number;
}

export interface DataCleaningReport {
  totalRowsProcessed: number;
  totalRowsCleaned: number;
  totalCellsCleaned: number;
  mappings: NormalizationMapping[];
}

export interface DriverBreakdownItem {
  name: string;
  q2Revenue: number;
  q3Revenue: number;
  revenueDelta: number;
  revenuePctChange: number | null;
  q2Units: number;
  q3Units: number;
  unitsDelta: number;
  unitsPctChange: number | null;
  q2AvgDiscountPct: number;
  q3AvgDiscountPct: number;
  discountPointDelta: number;
}

export interface RegionQ2Q3Comparison {
  region: string;
  q2Revenue: number;
  q3Revenue: number;
  revenueDelta: number;
  absRevenueDelta: number;
  revenuePctChange: number | null;
  q2Units: number;
  q3Units: number;
  unitsDelta: number;
  unitsPctChange: number | null;
  q2AvgDiscountPct: number;
  q3AvgDiscountPct: number;
  discountPointDelta: number;
  q2OrderCount: number;
  q3OrderCount: number;
  q2RevenuePerUnit: number;
  q3RevenuePerUnit: number;
  byChannel: DriverBreakdownItem[];
  byProduct: DriverBreakdownItem[];
}

export interface RegionYoYComparison {
  region: string;
  priorYearRevenue: number;
  currentYearRevenue: number;
  revenueDelta: number;
  revenuePctChange: number | null;
  priorYearUnits: number;
  currentYearUnits: number;
  unitsDelta: number;
  unitsPctChange: number | null;
  quarterlyBreakdown: {
    quarter: string;
    priorYearRevenue: number;
    currentYearRevenue: number;
    revenueDelta: number;
    revenuePctChange: number | null;
  }[];
}

export interface YoYAnalyticsResult {
  hasMultipleYears: boolean;
  years: string[]; // sorted chronological, e.g. ['2025', '2026']
  baseYear: string;
  comparisonYear: string;
  companyPriorRevenue: number;
  companyCurrentRevenue: number;
  companyRevenueDelta: number;
  companyRevenuePctChange: number | null;
  companyPriorUnits: number;
  companyCurrentUnits: number;
  companyUnitsDelta: number;
  companyUnitsPctChange: number | null;
  regionYoY: RegionYoYComparison[];
  topYoYRegion: RegionYoYComparison | null;
  matrixByYearAndRegion: Record<string, Record<string, number>>; // year -> region -> total revenue
  matrixByQuarterAndYear: Record<string, Record<string, number>>; // quarter -> year -> total revenue
}

export interface SalesAnalyticsResult {
  orders: SalesOrderRow[];
  hasYearData: boolean;
  years: string[];
  selectedYear: string; // 'ALL' or specific year like '2026'
  quarters: string[];
  regions: string[];
  channels: string[];
  products: string[];
  matrix: Record<string, Record<string, number>>; // region -> quarter -> revenue
  regionTotals: Record<string, number>;
  quarterTotals: Record<string, number>;
  grandTotalRevenue: number;
  totalUnits: number;
  avgDiscountPct: number;
  regionComparisons: RegionQ2Q3Comparison[];
  topChangedRegion: RegionQ2Q3Comparison | null;
  calculationPayloadForAI: Record<string, unknown> | null;
  yoyResult: YoYAnalyticsResult | null;
}

const REQUIRED_COLUMNS = [
  'quarter',
  'region',
  'channel',
  'product',
  'units',
  'discount_pct',
  'revenue',
] as const;

const KNOWN_ACRONYMS = new Set([
  'EMEA',
  'APAC',
  'LATAM',
  'NA',
  'NAMER',
  'AMER',
  'US',
  'USA',
  'UK',
  'EU',
  'ANZ',
  'DACH',
  'MENA',
  'NORAM',
  'B2B',
  'B2C',
  'SMB',
  'API',
  'AI',
  'ML',
  'ERP',
  'CRM',
  'POS',
  'VIP',
  'HQ',
  'IT',
  'IO',
  'OS',
  'UI',
  'UX',
  'PRO',
]);

const SPECIAL_CASED_TOKENS: Record<string, string> = {
  saas: 'SaaS',
  revops: 'RevOps',
  devops: 'DevOps',
  finops: 'FinOps',
  secops: 'SecOps',
  cloudops: 'CloudOps',
  dataops: 'DataOps',
  mlops: 'MLOps',
  ecommerce: 'eCommerce',
  'e-commerce': 'E-Commerce',
  selfserve: 'Self-Serve',
  'self-serve': 'Self-Serve',
};

const REGION_SYNONYMS: Record<string, string> = {
  'n america': 'North America',
  'n. america': 'North America',
  'north america': 'North America',
  's america': 'South America',
  's. america': 'South America',
  'south america': 'South America',
  'n. east': 'Northeast',
  'north east': 'Northeast',
  's. east': 'Southeast',
  'south east': 'Southeast',
  'n. west': 'Northwest',
  'north west': 'Northwest',
  's. west': 'Southwest',
  'south west': 'Southwest',
  'mid west': 'Midwest',
  'mid-west': 'Midwest',
};

export const DEFAULT_SALES_CSV = `quarter,region,channel,product,units,discount_pct,revenue
Q1,West,Enterprise Direct,Cloud Ledger Pro,420,5.0,159600
Q1,west,Partner Reseller,Analytics Core,310,8.0,85560
Q1,WEST ,Self-Serve Web,RevOps Suite,190,2.5,37050
Q1,East,Enterprise Direct,Cloud Ledger Pro,340,6.0,127840
Q1,east,Partner Reseller,Analytics Core,260,10.0,70200
Q1,Central,Partner Reseller,Cloud Ledger Pro,220,7.5,81400
Q1,central,Self-Serve Web,Analytics Core,180,4.0,51840
Q1,South,Partner Reseller,Analytics Core,150,12.0,39600
Q1,SOUTH,Self-Serve Web,RevOps Suite,110,5.0,20900
Q2,West,Enterprise Direct,Cloud Ledger Pro,460,5.0,174800
Q2,west,partner reseller,Analytics Core,330,7.5,91575
Q2,West,Self-Serve Web,RevOps Suite,210,3.0,40740
Q2,East,Enterprise Direct,Cloud Ledger Pro,360,6.5,134640
Q2,EAST,Partner Reseller,Analytics Core,290,9.5,78735
Q2,East,Self-Serve Web,RevOps Suite,145,4.0,27840
Q2,Central,Enterprise Direct,Cloud Ledger Pro,250,6.0,94000
Q2,central ,Partner Reseller,Analytics Core,210,8.0,57960
Q2,Central,Self-Serve Web,RevOps Suite,130,3.5,25090
Q2,South,Partner Reseller,Analytics Core,165,11.0,44055
Q2,south,Self-Serve Web,RevOps Suite,125,5.0,23750
Q3,West,Enterprise Direct,Cloud Ledger Pro,685,2.0,268520
Q3,west,Enterprise Direct,RevOps Suite,310,1.5,61070
Q3,WEST,Partner Reseller,Analytics Core,440,4.0,126720
Q3,West ,self-serve web,RevOps Suite,255,2.0,50000
Q3,East,Enterprise Direct,Cloud Ledger Pro,310,11.5,109740
Q3,east,Partner Reseller,Analytics Core,240,14.0,61920
Q3,East,Self-Serve Web,RevOps Suite,120,8.0,22080
Q3,Central,Enterprise Direct,Cloud Ledger Pro,310,4.5,118420
Q3,Central,Partner Reseller,Analytics Core,245,6.5,68722.5
Q3,central,Self-Serve Web,RevOps Suite,155,3.0,30070
Q3,South,Partner Reseller,Analytics Core,180,10.0,48600
Q3,south,Self-Serve Web,RevOps Suite,140,4.5,26740
Q4,West,Enterprise Direct,Cloud Ledger Pro,710,3.0,275480
Q4,west,Partner Reseller,Analytics Core,460,4.5,131790
Q4,West,Self-Serve Web,RevOps Suite,280,2.0,54880
Q4,East,Enterprise Direct,Cloud Ledger Pro,390,7.0,145080
Q4,East,Partner Reseller,Analytics Core,310,8.5,85095
Q4,east,Self-Serve Web,RevOps Suite,160,4.0,30720
Q4,Central,Enterprise Direct,Cloud Ledger Pro,340,4.0,130560
Q4,Central,Partner Reseller,Analytics Core,265,6.0,74730
Q4,Central,Self-Serve Web,RevOps Suite,170,2.5,33150
Q4,South,Partner Reseller,Analytics Core,195,9.0,53235
Q4,South,Self-Serve Web,RevOps Suite,155,4.0,29760`;

export const MULTI_YEAR_SALES_CSV = `year,quarter,region,channel,product,units,discount_pct,revenue
2025,Q1,West,Enterprise Direct,Cloud Ledger Pro,360,6.0,135360
2025,Q1,West,Partner Reseller,Analytics Core,270,9.0,73710
2025,Q1,East,Enterprise Direct,Cloud Ledger Pro,300,7.0,111600
2025,Q1,Central,Partner Reseller,Cloud Ledger Pro,190,8.0,69920
2025,Q1,South,Partner Reseller,Analytics Core,130,12.0,34320
2025,Q2,West,Enterprise Direct,Cloud Ledger Pro,390,6.0,146640
2025,Q2,West,Partner Reseller,Analytics Core,290,8.0,79025
2025,Q2,East,Enterprise Direct,Cloud Ledger Pro,320,7.0,119040
2025,Q2,Central,Enterprise Direct,Cloud Ledger Pro,210,7.0,78120
2025,Q2,South,Partner Reseller,Analytics Core,140,11.0,37380
2025,Q3,West,Enterprise Direct,Cloud Ledger Pro,480,4.0,184320
2025,Q3,West,Partner Reseller,Analytics Core,330,6.0,93060
2025,Q3,East,Enterprise Direct,Cloud Ledger Pro,300,12.0,105600
2025,Q3,Central,Enterprise Direct,Cloud Ledger Pro,240,6.0,90240
2025,Q3,South,Partner Reseller,Analytics Core,150,11.0,40050
2025,Q4,West,Enterprise Direct,Cloud Ledger Pro,520,4.0,199680
2025,Q4,East,Enterprise Direct,Cloud Ledger Pro,340,8.0,125120
2025,Q4,Central,Enterprise Direct,Cloud Ledger Pro,260,6.0,97760
2025,Q4,South,Partner Reseller,Analytics Core,160,10.0,43200
2026,Q1,West,Enterprise Direct,Cloud Ledger Pro,420,5.0,159600
2026,Q1,west,Partner Reseller,Analytics Core,310,8.0,85560
2026,Q1,WEST ,Self-Serve Web,RevOps Suite,190,2.5,37050
2026,Q1,East,Enterprise Direct,Cloud Ledger Pro,340,6.0,127840
2026,Q1,east,Partner Reseller,Analytics Core,260,10.0,70200
2026,Q1,Central,Partner Reseller,Cloud Ledger Pro,220,7.5,81400
2026,Q1,South,Partner Reseller,Analytics Core,150,12.0,39600
2026,Q2,West,Enterprise Direct,Cloud Ledger Pro,460,5.0,174800
2026,Q2,west,partner reseller,Analytics Core,330,7.5,91575
2026,Q2,West,Self-Serve Web,RevOps Suite,210,3.0,40740
2026,Q2,East,Enterprise Direct,Cloud Ledger Pro,360,6.5,134640
2026,Q2,Central,Enterprise Direct,Cloud Ledger Pro,250,6.0,94000
2026,Q2,South,Partner Reseller,Analytics Core,165,11.0,44055
2026,Q3,West,Enterprise Direct,Cloud Ledger Pro,685,2.0,268520
2026,Q3,west,Enterprise Direct,RevOps Suite,310,1.5,61070
2026,Q3,WEST,Partner Reseller,Analytics Core,440,4.0,126720
2026,Q3,West ,self-serve web,RevOps Suite,255,2.0,50000
2026,Q3,East,Enterprise Direct,Cloud Ledger Pro,310,11.5,109740
2026,Q3,Central,Enterprise Direct,Cloud Ledger Pro,310,4.5,118420
2026,Q3,South,Partner Reseller,Analytics Core,180,10.0,48600
2026,Q4,West,Enterprise Direct,Cloud Ledger Pro,710,3.0,275480
2026,Q4,East,Enterprise Direct,Cloud Ledger Pro,390,7.0,145080
2026,Q4,Central,Enterprise Direct,Cloud Ledger Pro,340,4.0,130560
2026,Q4,South,Partner Reseller,Analytics Core,195,9.0,53235`;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function cleanNumber(raw: string): number {
  const trimmed = raw.trim();
  const isParenNegative = trimmed.startsWith('(') && trimmed.endsWith(')');
  const cleaned = trimmed.replace(/[$,%\s()]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return NaN;
  return isParenNegative ? -parsed : parsed;
}

/**
 * Extracts and normalizes quarter and optional year from a string.
 * Supports strings like:
 * - "Q1" -> quarter "Q1", year undefined
 * - "2026 Q1", "Q1 2026", "2026-Q1", "2026Q1", "Q1/2026", "FY26 Q2"
 */
export function extractQuarterAndYear(raw: string): { quarter: string; extractedYear?: string } {
  const cleaned = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toUpperCase();

  // Look for 4-digit year like 2024, 2025, 2026, 2027, etc.
  let extractedYear: string | undefined;
  const year4Match = cleaned.match(/\b(19\d{2}|20\d{2})\b/);
  if (year4Match) {
    extractedYear = year4Match[1];
  } else {
    // 2-digit fiscal year like FY26 or '26
    const fyMatch = cleaned.match(/\b(?:FY|')?([2-3]\d)\b/);
    if (fyMatch && !cleaned.match(/Q[1-4]/i)?.includes(fyMatch[1])) {
      // Avoid false positive matching the quarter number
      extractedYear = `20${fyMatch[1]}`;
    }
  }

  // Find quarter
  let quarter = 'Q1';
  const qMatch = cleaned.match(/Q(?:UARTER|TR)?[\s\-_]*([1-4])\b/);
  if (qMatch) {
    quarter = `Q${qMatch[1]}`;
  } else {
    const directMatch = cleaned.match(/\bQ([1-4])\b/);
    if (directMatch) {
      quarter = `Q${directMatch[1]}`;
    } else if (['1', '1ST', 'FIRST', 'FIRST QUARTER', '1ST QUARTER'].some((k) => cleaned.includes(k))) {
      quarter = 'Q1';
    } else if (['2', '2ND', 'SECOND', 'SECOND QUARTER', '2ND QUARTER'].some((k) => cleaned.includes(k))) {
      quarter = 'Q2';
    } else if (['3', '3RD', 'THIRD', 'THIRD QUARTER', '3RD QUARTER'].some((k) => cleaned.includes(k))) {
      quarter = 'Q3';
    } else if (['4', '4TH', 'FOURTH', 'FOURTH QUARTER', '4TH QUARTER'].some((k) => cleaned.includes(k))) {
      quarter = 'Q4';
    }
  }

  return { quarter, extractedYear };
}

export function normalizeQuarter(raw: string): string {
  return extractQuarterAndYear(raw).quarter;
}

export function normalizeYear(raw: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const match = cleaned.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return match[1];
  const shortMatch = cleaned.match(/\b(?:FY)?'?([2-3]\d)\b/i);
  if (shortMatch) return `20${shortMatch[1]}`;
  return undefined;
}

function formatWordToken(token: string): string {
  if (!token) return '';
  const lower = token.toLowerCase();
  if (SPECIAL_CASED_TOKENS[lower]) {
    return SPECIAL_CASED_TOKENS[lower];
  }
  const upper = token.toUpperCase();
  if (KNOWN_ACRONYMS.has(upper) && upper !== 'PRO') {
    return upper;
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export function normalizeTextLabel(
  raw: string,
  column: 'region' | 'channel' | 'product'
): string {
  let cleaned = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/[.,;]+$/g, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s*[-–—]+\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const lowerKey = cleaned.toLowerCase();
  if (column === 'region' && REGION_SYNONYMS[lowerKey]) {
    return REGION_SYNONYMS[lowerKey];
  }
  if (SPECIAL_CASED_TOKENS[lowerKey]) {
    return SPECIAL_CASED_TOKENS[lowerKey];
  }

  cleaned = cleaned
    .split(' ')
    .map((word) => {
      if (SPECIAL_CASED_TOKENS[word.toLowerCase()]) {
        return SPECIAL_CASED_TOKENS[word.toLowerCase()];
      }
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => formatWordToken(part))
          .join('-');
      }
      return formatWordToken(word);
    })
    .join(' ');

  if (column === 'region') {
    const postLower = cleaned.toLowerCase().replace(/-/g, ' ');
    if (REGION_SYNONYMS[postLower]) {
      return REGION_SYNONYMS[postLower];
    }
  }

  return cleaned;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

const PROTECTED_DISTINCT_PAIRS = new Set([
  'east|west',
  'west|east',
  'north|south',
  'south|north',
]);

function buildColumnCanonicalMap(
  rawValues: string[],
  column: 'region' | 'channel' | 'product'
): Map<string, string> {
  const normalizedCounts = new Map<string, number>();
  const rawToNormalized = new Map<string, string>();

  for (const raw of rawValues) {
    const norm = normalizeTextLabel(raw, column);
    rawToNormalized.set(raw, norm);
    normalizedCounts.set(norm, (normalizedCounts.get(norm) || 0) + 1);
  }

  const distinctNorms = Array.from(normalizedCounts.keys()).sort(
    (a, b) => (normalizedCounts.get(b) || 0) - (normalizedCounts.get(a) || 0)
  );

  const normToCanonical = new Map<string, string>();

  for (const candidate of distinctNorms) {
    const candidateSkeleton = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    let matchedCanonical: string | null = null;

    for (const existingCanonical of normToCanonical.values()) {
      const existingSkeleton = existingCanonical
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (candidateSkeleton === existingSkeleton) {
        matchedCanonical = existingCanonical;
        break;
      }

      const pairKey = `${candidateSkeleton}|${existingSkeleton}`;
      if (
        !PROTECTED_DISTINCT_PAIRS.has(pairKey) &&
        candidateSkeleton.length >= 4 &&
        existingSkeleton.length >= 4
      ) {
        const dist = levenshteinDistance(candidateSkeleton, existingSkeleton);
        const maxDist = candidateSkeleton.length >= 8 ? 2 : 1;
        if (
          dist <= maxDist &&
          (candidateSkeleton[0] === existingSkeleton[0] ||
            candidateSkeleton[candidateSkeleton.length - 1] ===
              existingSkeleton[existingSkeleton.length - 1])
        ) {
          matchedCanonical = existingCanonical;
          break;
        }
      }
    }

    normToCanonical.set(candidate, matchedCanonical || candidate);
  }

  const finalMap = new Map<string, string>();
  for (const [raw, norm] of rawToNormalized.entries()) {
    finalMap.set(raw, normToCanonical.get(norm) || norm);
  }
  return finalMap;
}

export function parseSalesCSV(csvText: string): {
  rows: SalesOrderRow[];
  error: string | null;
  cleaningReport: DataCleaningReport;
  hasYearColumn: boolean;
} {
  const emptyReport: DataCleaningReport = {
    totalRowsProcessed: 0,
    totalRowsCleaned: 0,
    totalCellsCleaned: 0,
    mappings: [],
  };

  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      error: 'CSV file must contain a header row and at least one sales order row.',
      cleaningReport: emptyReport,
      hasYearColumn: false,
    };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) =>
    h
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
  );

  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !rawHeaders.includes(col)
  );

  if (missingColumns.length > 0) {
    return {
      rows: [],
      error: `Missing required CSV column(s): ${missingColumns.join(
        ', '
      )}. Expected columns: quarter, region, channel, product, units, discount_pct, revenue. (Optional: year, fiscal_year)`,
      cleaningReport: emptyReport,
      hasYearColumn: false,
    };
  }

  const yearColIdx = rawHeaders.findIndex(
    (h) => h === 'year' || h === 'fiscal_year' || h === 'fy' || h === 'sales_year'
  );
  const hasYearColumn = yearColIdx !== -1;

  const colIndex = {
    quarter: rawHeaders.indexOf('quarter'),
    year: yearColIdx,
    region: rawHeaders.indexOf('region'),
    channel: rawHeaders.indexOf('channel'),
    product: rawHeaders.indexOf('product'),
    units: rawHeaders.indexOf('units'),
    discount_pct: rawHeaders.indexOf('discount_pct'),
    revenue: rawHeaders.indexOf('revenue'),
  };

  interface RawParsedRow {
    lineNumber: number;
    rawQuarter: string;
    rawYear?: string;
    rawRegion: string;
    rawChannel: string;
    rawProduct: string;
    units: number;
    discount_pct: number;
    revenue: number;
  }

  const rawRows: RawParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length === 1 && cells[0].trim() === '') continue;

    const rawQuarter = cells[colIndex.quarter] ?? '';
    const rawYear = colIndex.year !== -1 ? cells[colIndex.year] ?? '' : undefined;
    const rawRegion = cells[colIndex.region] ?? '';
    const rawChannel = cells[colIndex.channel] ?? '';
    const rawProduct = cells[colIndex.product] ?? '';
    const units = cleanNumber(cells[colIndex.units] ?? '');
    const discount_pct = cleanNumber(cells[colIndex.discount_pct] ?? '');
    const revenue = cleanNumber(cells[colIndex.revenue] ?? '');

    if (
      !rawQuarter.trim() ||
      !rawRegion.trim() ||
      !rawChannel.trim() ||
      !rawProduct.trim() ||
      Number.isNaN(units) ||
      Number.isNaN(discount_pct) ||
      Number.isNaN(revenue)
    ) {
      return {
        rows: [],
        error: `Invalid data on row ${
          i + 1
        }. Ensure quarter, region, channel, product are non-empty and units, discount_pct, and revenue are valid numbers.`,
        cleaningReport: emptyReport,
        hasYearColumn,
      };
    }

    rawRows.push({
      lineNumber: i,
      rawQuarter,
      rawYear,
      rawRegion,
      rawChannel,
      rawProduct,
      units,
      discount_pct,
      revenue,
    });
  }

  if (rawRows.length === 0) {
    return {
      rows: [],
      error: 'No valid sales order rows found in the uploaded CSV.',
      cleaningReport: emptyReport,
      hasYearColumn,
    };
  }

  const regionCanonicalMap = buildColumnCanonicalMap(
    rawRows.map((r) => r.rawRegion),
    'region'
  );
  const channelCanonicalMap = buildColumnCanonicalMap(
    rawRows.map((r) => r.rawChannel),
    'channel'
  );
  const productCanonicalMap = buildColumnCanonicalMap(
    rawRows.map((r) => r.rawProduct),
    'product'
  );

  const mappingTracker = new Map<
    string,
    {
      column: 'quarter' | 'year' | 'region' | 'channel' | 'product';
      canonicalValue: string;
      rawVariants: Set<string>;
      affectedRows: number;
    }
  >();

  const recordCleaning = (
    column: 'quarter' | 'year' | 'region' | 'channel' | 'product',
    rawVal: string,
    canonicalVal: string
  ) => {
    if (rawVal === canonicalVal) return false;
    const key = `${column}:::${canonicalVal}`;
    const existing = mappingTracker.get(key);
    const displayRaw = rawVal.trim() !== rawVal ? `"${rawVal}" (extra spaces)` : `"${rawVal}"`;
    if (existing) {
      existing.rawVariants.add(displayRaw);
      existing.affectedRows += 1;
    } else {
      mappingTracker.set(key, {
        column,
        canonicalValue: canonicalVal,
        rawVariants: new Set([displayRaw]),
        affectedRows: 1,
      });
    }
    return true;
  };

  let totalRowsCleaned = 0;
  let totalCellsCleaned = 0;

  const rows: SalesOrderRow[] = rawRows.map((r) => {
    // Determine quarter and year
    const extracted = extractQuarterAndYear(r.rawQuarter);
    const quarter = extracted.quarter;
    let year = r.rawYear ? normalizeYear(r.rawYear) : extracted.extractedYear;

    const region =
      regionCanonicalMap.get(r.rawRegion) ||
      normalizeTextLabel(r.rawRegion, 'region');
    const channel =
      channelCanonicalMap.get(r.rawChannel) ||
      normalizeTextLabel(r.rawChannel, 'channel');
    const product =
      productCanonicalMap.get(r.rawProduct) ||
      normalizeTextLabel(r.rawProduct, 'product');

    const cleanedFields: Partial<
      Record<'quarter' | 'year' | 'region' | 'channel' | 'product', string>
    > = {};

    let rowCleaned = false;

    if (recordCleaning('quarter', r.rawQuarter, quarter)) {
      cleanedFields.quarter = r.rawQuarter;
      totalCellsCleaned++;
      rowCleaned = true;
    }
    if (r.rawYear && year && recordCleaning('year', r.rawYear, year)) {
      cleanedFields.year = r.rawYear;
      totalCellsCleaned++;
      rowCleaned = true;
    }
    if (recordCleaning('region', r.rawRegion, region)) {
      cleanedFields.region = r.rawRegion;
      totalCellsCleaned++;
      rowCleaned = true;
    }
    if (recordCleaning('channel', r.rawChannel, channel)) {
      cleanedFields.channel = r.rawChannel;
      totalCellsCleaned++;
      rowCleaned = true;
    }
    if (recordCleaning('product', r.rawProduct, product)) {
      cleanedFields.product = r.rawProduct;
      totalCellsCleaned++;
      rowCleaned = true;
    }

    if (rowCleaned) {
      totalRowsCleaned++;
    }

    const periodKey = year ? `${year} ${quarter}` : quarter;

    return {
      id: `row-${r.lineNumber}`,
      quarter,
      year,
      periodKey,
      region,
      channel,
      product,
      units: r.units,
      discount_pct: r.discount_pct,
      revenue: r.revenue,
      cleanedFields: rowCleaned ? cleanedFields : undefined,
    };
  });

  const mappings: NormalizationMapping[] = Array.from(
    mappingTracker.values()
  ).map((m) => ({
    column: m.column,
    canonicalValue: m.canonicalValue,
    rawVariants: Array.from(m.rawVariants),
    affectedRows: m.affectedRows,
  }));

  return {
    rows,
    error: null,
    cleaningReport: {
      totalRowsProcessed: rows.length,
      totalRowsCleaned,
      totalCellsCleaned,
      mappings,
    },
    hasYearColumn,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function buildDriverBreakdown(
  q2Orders: SalesOrderRow[],
  q3Orders: SalesOrderRow[],
  keyExtractor: (row: SalesOrderRow) => string
): DriverBreakdownItem[] {
  const keys = Array.from(
    new Set([...q2Orders.map(keyExtractor), ...q3Orders.map(keyExtractor)])
  );

  const items: DriverBreakdownItem[] = keys.map((name) => {
    const q2Sub = q2Orders.filter((r) => keyExtractor(r) === name);
    const q3Sub = q3Orders.filter((r) => keyExtractor(r) === name);

    const q2Revenue = round2(q2Sub.reduce((s, r) => s + r.revenue, 0));
    const q3Revenue = round2(q3Sub.reduce((s, r) => s + r.revenue, 0));
    const revenueDelta = round2(q3Revenue - q2Revenue);
    const revenuePctChange =
      q2Revenue > 0 ? round2(((q3Revenue - q2Revenue) / q2Revenue) * 100) : null;

    const q2Units = round2(q2Sub.reduce((s, r) => s + r.units, 0));
    const q3Units = round2(q3Sub.reduce((s, r) => s + r.units, 0));
    const unitsDelta = round2(q3Units - q2Units);
    const unitsPctChange =
      q2Units > 0 ? round2(((q3Units - q2Units) / q2Units) * 100) : null;

    const q2AvgDiscountPct =
      q2Sub.length > 0
        ? round2(
            q2Sub.reduce((s, r) => s + r.discount_pct, 0) / q2Sub.length
          )
        : 0;
    const q3AvgDiscountPct =
      q3Sub.length > 0
        ? round2(
            q3Sub.reduce((s, r) => s + r.discount_pct, 0) / q3Sub.length
          )
        : 0;
    const discountPointDelta = round2(q3AvgDiscountPct - q2AvgDiscountPct);

    return {
      name,
      q2Revenue,
      q3Revenue,
      revenueDelta,
      revenuePctChange,
      q2Units,
      q3Units,
      unitsDelta,
      unitsPctChange,
      q2AvgDiscountPct,
      q3AvgDiscountPct,
      discountPointDelta,
    };
  });

  return items.sort(
    (a, b) => Math.abs(b.revenueDelta) - Math.abs(a.revenueDelta)
  );
}

/**
 * Computes Year-over-Year (YoY) comparison across available years.
 */
export function computeYoYAnalytics(
  orders: SalesOrderRow[],
  baseYearOverride?: string,
  comparisonYearOverride?: string
): YoYAnalyticsResult | null {
  const yearsFound = Array.from(
    new Set(orders.map((r) => r.year).filter((y): y is string => Boolean(y)))
  ).sort((a, b) => Number(a) - Number(b));

  if (yearsFound.length < 2) {
    return {
      hasMultipleYears: false,
      years: yearsFound,
      baseYear: yearsFound[0] || '',
      comparisonYear: yearsFound[0] || '',
      companyPriorRevenue: 0,
      companyCurrentRevenue: 0,
      companyRevenueDelta: 0,
      companyRevenuePctChange: null,
      companyPriorUnits: 0,
      companyCurrentUnits: 0,
      companyUnitsDelta: 0,
      companyUnitsPctChange: null,
      regionYoY: [],
      topYoYRegion: null,
      matrixByYearAndRegion: {},
      matrixByQuarterAndYear: {},
    };
  }

  // Default comparison: last two chronological years (e.g., 2025 vs 2026)
  const baseYear =
    baseYearOverride && yearsFound.includes(baseYearOverride)
      ? baseYearOverride
      : yearsFound[yearsFound.length - 2];
  const comparisonYear =
    comparisonYearOverride && yearsFound.includes(comparisonYearOverride)
      ? comparisonYearOverride
      : yearsFound[yearsFound.length - 1];

  const priorOrders = orders.filter((r) => r.year === baseYear);
  const currentOrders = orders.filter((r) => r.year === comparisonYear);

  const companyPriorRevenue = round2(priorOrders.reduce((s, r) => s + r.revenue, 0));
  const companyCurrentRevenue = round2(currentOrders.reduce((s, r) => s + r.revenue, 0));
  const companyRevenueDelta = round2(companyCurrentRevenue - companyPriorRevenue);
  const companyRevenuePctChange =
    companyPriorRevenue > 0
      ? round2(((companyCurrentRevenue - companyPriorRevenue) / companyPriorRevenue) * 100)
      : null;

  const companyPriorUnits = round2(priorOrders.reduce((s, r) => s + r.units, 0));
  const companyCurrentUnits = round2(currentOrders.reduce((s, r) => s + r.units, 0));
  const companyUnitsDelta = round2(companyCurrentUnits - companyPriorUnits);
  const companyUnitsPctChange =
    companyPriorUnits > 0
      ? round2(((companyCurrentUnits - companyPriorUnits) / companyPriorUnits) * 100)
      : null;

  // Regions list
  const regions = Array.from(new Set(orders.map((r) => r.region))).sort();

  const regionYoY: RegionYoYComparison[] = regions.map((region) => {
    const regPrior = priorOrders.filter((r) => r.region === region);
    const regCurrent = currentOrders.filter((r) => r.region === region);

    const priorYearRevenue = round2(regPrior.reduce((s, r) => s + r.revenue, 0));
    const currentYearRevenue = round2(regCurrent.reduce((s, r) => s + r.revenue, 0));
    const revenueDelta = round2(currentYearRevenue - priorYearRevenue);
    const revenuePctChange =
      priorYearRevenue > 0
        ? round2(((currentYearRevenue - priorYearRevenue) / priorYearRevenue) * 100)
        : null;

    const priorYearUnits = round2(regPrior.reduce((s, r) => s + r.units, 0));
    const currentYearUnits = round2(regCurrent.reduce((s, r) => s + r.units, 0));
    const unitsDelta = round2(currentYearUnits - priorYearUnits);
    const unitsPctChange =
      priorYearUnits > 0
        ? round2(((currentYearUnits - priorYearUnits) / priorYearUnits) * 100)
        : null;

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterlyBreakdown = quarters.map((q) => {
      const qPrior = regPrior
        .filter((r) => r.quarter === q)
        .reduce((s, r) => s + r.revenue, 0);
      const qCurr = regCurrent
        .filter((r) => r.quarter === q)
        .reduce((s, r) => s + r.revenue, 0);
      const qDelta = round2(qCurr - qPrior);
      const qPct =
        qPrior > 0 ? round2(((qCurr - qPrior) / qPrior) * 100) : null;
      return {
        quarter: q,
        priorYearRevenue: round2(qPrior),
        currentYearRevenue: round2(qCurr),
        revenueDelta: qDelta,
        revenuePctChange: qPct,
      };
    });

    return {
      region,
      priorYearRevenue,
      currentYearRevenue,
      revenueDelta,
      revenuePctChange,
      priorYearUnits,
      currentYearUnits,
      unitsDelta,
      unitsPctChange,
      quarterlyBreakdown,
    };
  });

  const sortedByAbsChange = [...regionYoY].sort(
    (a, b) => Math.abs(b.revenueDelta) - Math.abs(a.revenueDelta)
  );

  // Matrices for charts
  const matrixByYearAndRegion: Record<string, Record<string, number>> = {};
  for (const y of yearsFound) {
    matrixByYearAndRegion[y] = {};
    for (const r of regions) {
      matrixByYearAndRegion[y][r] = round2(
        orders
          .filter((row) => row.year === y && row.region === r)
          .reduce((s, r) => s + r.revenue, 0)
      );
    }
  }

  const matrixByQuarterAndYear: Record<string, Record<string, number>> = {};
  for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
    matrixByQuarterAndYear[q] = {};
    for (const y of yearsFound) {
      matrixByQuarterAndYear[q][y] = round2(
        orders
          .filter((row) => row.quarter === q && row.year === y)
          .reduce((s, r) => s + r.revenue, 0)
      );
    }
  }

  return {
    hasMultipleYears: true,
    years: yearsFound,
    baseYear,
    comparisonYear,
    companyPriorRevenue,
    companyCurrentRevenue,
    companyRevenueDelta,
    companyRevenuePctChange,
    companyPriorUnits,
    companyCurrentUnits,
    companyUnitsDelta,
    companyUnitsPctChange,
    regionYoY: sortedByAbsChange,
    topYoYRegion: sortedByAbsChange.length > 0 ? sortedByAbsChange[0] : null,
    matrixByYearAndRegion,
    matrixByQuarterAndYear,
  };
}

export function analyzeSalesOrders(
  orders: SalesOrderRow[],
  selectedYear: string = 'ALL'
): SalesAnalyticsResult {
  // Check year distribution
  const distinctYears = Array.from(
    new Set(orders.map((r) => r.year).filter((y): y is string => Boolean(y)))
  ).sort((a, b) => Number(a) - Number(b));

  const hasYearData = distinctYears.length > 0;

  // If a specific year is chosen (not 'ALL'), filter active orders for quarterly view
  const activeOrders =
    selectedYear !== 'ALL' && distinctYears.includes(selectedYear)
      ? orders.filter((r) => r.year === selectedYear)
      : orders;

  const quarterSet = new Set<string>();
  const regionSet = new Set<string>();
  const channelSet = new Set<string>();
  const productSet = new Set<string>();

  for (const row of activeOrders) {
    quarterSet.add(row.quarter);
    regionSet.add(row.region);
    channelSet.add(row.channel);
    productSet.add(row.product);
  }

  const quarters = Array.from(quarterSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  const regions = Array.from(regionSet).sort();
  const channels = Array.from(channelSet).sort();
  const products = Array.from(productSet).sort();

  const matrix: Record<string, Record<string, number>> = {};
  const regionTotals: Record<string, number> = {};
  const quarterTotals: Record<string, number> = {};

  for (const r of regions) {
    matrix[r] = {};
    regionTotals[r] = 0;
    for (const q of quarters) {
      matrix[r][q] = 0;
    }
  }
  for (const q of quarters) {
    quarterTotals[q] = 0;
  }

  let grandTotalRevenue = 0;
  let totalUnits = 0;
  let discountSum = 0;

  for (const row of activeOrders) {
    matrix[row.region][row.quarter] = round2(
      (matrix[row.region][row.quarter] || 0) + row.revenue
    );
    regionTotals[row.region] = round2(regionTotals[row.region] + row.revenue);
    quarterTotals[row.quarter] = round2(
      (quarterTotals[row.quarter] || 0) + row.revenue
    );
    grandTotalRevenue = round2(grandTotalRevenue + row.revenue);
    totalUnits = round2(totalUnits + row.units);
    discountSum += row.discount_pct;
  }

  const sortedRegions = [...regions].sort(
    (a, b) => (regionTotals[b] || 0) - (regionTotals[a] || 0)
  );

  const avgDiscountPct =
    activeOrders.length > 0 ? round2(discountSum / activeOrders.length) : 0;

  const regionComparisons: RegionQ2Q3Comparison[] = sortedRegions.map(
    (region) => {
      const q2Orders = activeOrders.filter(
        (r) => r.region === region && r.quarter.toUpperCase() === 'Q2'
      );
      const q3Orders = activeOrders.filter(
        (r) => r.region === region && r.quarter.toUpperCase() === 'Q3'
      );

      const q2Revenue = round2(q2Orders.reduce((s, r) => s + r.revenue, 0));
      const q3Revenue = round2(q3Orders.reduce((s, r) => s + r.revenue, 0));
      const revenueDelta = round2(q3Revenue - q2Revenue);
      const absRevenueDelta = round2(Math.abs(revenueDelta));
      const revenuePctChange =
        q2Revenue > 0
          ? round2(((q3Revenue - q2Revenue) / q2Revenue) * 100)
          : null;

      const q2Units = round2(q2Orders.reduce((s, r) => s + r.units, 0));
      const q3Units = round2(q3Orders.reduce((s, r) => s + r.units, 0));
      const unitsDelta = round2(q3Units - q2Units);
      const unitsPctChange =
        q2Units > 0 ? round2(((q3Units - q2Units) / q2Units) * 100) : null;

      const q2AvgDiscountPct =
        q2Orders.length > 0
          ? round2(
              q2Orders.reduce((s, r) => s + r.discount_pct, 0) / q2Orders.length
            )
          : 0;
      const q3AvgDiscountPct =
        q3Orders.length > 0
          ? round2(
              q3Orders.reduce((s, r) => s + r.discount_pct, 0) / q3Orders.length
            )
          : 0;
      const discountPointDelta = round2(q3AvgDiscountPct - q2AvgDiscountPct);

      const q2RevenuePerUnit =
        q2Units > 0 ? round2(q2Revenue / q2Units) : 0;
      const q3RevenuePerUnit =
        q3Units > 0 ? round2(q3Revenue / q3Units) : 0;

      const byChannel = buildDriverBreakdown(
        q2Orders,
        q3Orders,
        (r) => r.channel
      );
      const byProduct = buildDriverBreakdown(
        q2Orders,
        q3Orders,
        (r) => r.product
      );

      return {
        region,
        q2Revenue,
        q3Revenue,
        revenueDelta,
        absRevenueDelta,
        revenuePctChange,
        q2Units,
        q3Units,
        unitsDelta,
        unitsPctChange,
        q2AvgDiscountPct,
        q3AvgDiscountPct,
        discountPointDelta,
        q2OrderCount: q2Orders.length,
        q3OrderCount: q3Orders.length,
        q2RevenuePerUnit,
        q3RevenuePerUnit,
        byChannel,
        byProduct,
      };
    }
  );

  const rankedByChange = [...regionComparisons].sort(
    (a, b) => b.absRevenueDelta - a.absRevenueDelta
  );

  const topChangedRegion = rankedByChange.length > 0 ? rankedByChange[0] : null;

  const yoyResult = computeYoYAnalytics(orders);

  const calculationPayloadForAI = topChangedRegion
    ? {
        selectedYearContext: selectedYear !== 'ALL' ? selectedYear : 'All Years Combined',
        allRegionsQ2ToQ3Ranking: rankedByChange.map((rc, index) => ({
          rankByAbsoluteChange: index + 1,
          region: rc.region,
          q2Revenue: rc.q2Revenue,
          q3Revenue: rc.q3Revenue,
          revenueDelta: rc.revenueDelta,
          absRevenueDelta: rc.absRevenueDelta,
          revenuePctChange: rc.revenuePctChange,
          q2Units: rc.q2Units,
          q3Units: rc.q3Units,
          unitsDelta: rc.unitsDelta,
          unitsPctChange: rc.unitsPctChange,
          q2AvgDiscountPct: rc.q2AvgDiscountPct,
          q3AvgDiscountPct: rc.q3AvgDiscountPct,
          discountPointDelta: rc.discountPointDelta,
        })),
        topChangedRegion: {
          region: topChangedRegion.region,
          q2Revenue: topChangedRegion.q2Revenue,
          q3Revenue: topChangedRegion.q3Revenue,
          revenueDelta: topChangedRegion.revenueDelta,
          absRevenueDelta: topChangedRegion.absRevenueDelta,
          revenuePctChange: topChangedRegion.revenuePctChange,
          q2Units: topChangedRegion.q2Units,
          q3Units: topChangedRegion.q3Units,
          unitsDelta: topChangedRegion.unitsDelta,
          unitsPctChange: topChangedRegion.unitsPctChange,
          q2AvgDiscountPct: topChangedRegion.q2AvgDiscountPct,
          q3AvgDiscountPct: topChangedRegion.q3AvgDiscountPct,
          discountPointDelta: topChangedRegion.discountPointDelta,
          q2RevenuePerUnit: topChangedRegion.q2RevenuePerUnit,
          q3RevenuePerUnit: topChangedRegion.q3RevenuePerUnit,
          productDrivers: topChangedRegion.byProduct,
          channelDrivers: topChangedRegion.byChannel,
        },
        yearOverYearContext: yoyResult?.hasMultipleYears
          ? {
              baseYear: yoyResult.baseYear,
              comparisonYear: yoyResult.comparisonYear,
              companyPriorRevenue: yoyResult.companyPriorRevenue,
              companyCurrentRevenue: yoyResult.companyCurrentRevenue,
              companyRevenueDelta: yoyResult.companyRevenueDelta,
              companyRevenuePctChange: yoyResult.companyRevenuePctChange,
              topYoYRegion: yoyResult.topYoYRegion?.region,
              topYoYRevenueDelta: yoyResult.topYoYRegion?.revenueDelta,
              topYoYRevenuePctChange: yoyResult.topYoYRegion?.revenuePctChange,
            }
          : undefined,
      }
    : null;

  return {
    orders: activeOrders,
    hasYearData,
    years: distinctYears,
    selectedYear,
    quarters,
    regions: sortedRegions,
    channels,
    products,
    matrix,
    regionTotals,
    quarterTotals,
    grandTotalRevenue,
    totalUnits,
    avgDiscountPct,
    regionComparisons: rankedByChange,
    topChangedRegion,
    calculationPayloadForAI,
    yoyResult,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSignedCurrency(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatCurrency(value)}`;
}

export function formatSignedPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}
