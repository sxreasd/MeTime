import {
  CategoryConfig,
  Jar,
  JarCircle,
  JarColorKey,
  Settings,
  Transaction,
  TransactionType,
} from '../types/money';

export interface ParsedImportPayload {
  format: 'json' | 'csv';
  transactions?: Transaction[];
  jars?: Jar[];
  categories?: CategoryConfig[];
  settings?: Partial<Settings>;
  summaryCounts: {
    transactions: number;
    jars: number;
    categories: number;
    hasSettings: boolean;
  };
}

export type ParseImportResult =
  | { ok: true; data: ParsedImportPayload }
  | { ok: false; error: string };

const VALID_TX_TYPES = new Set<TransactionType>([
  'spend',
  'add',
  'jar_deposit',
  'jar_withdraw',
]);

const VALID_JAR_COLORS = new Set<JarColorKey>([
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
  'orange',
]);

function makeImportId(prefix: string, index: number): string {
  return `${prefix}_imp_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseBooleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return null;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function validateJar(
  raw: unknown,
  index: number,
  generateCircles: () => JarCircle[]
): { ok: true; jar: Jar } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `Jar #${index + 1} is not a valid object.` };
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) {
    return { ok: false, error: `Jar #${index + 1} is missing a valid name.` };
  }

  const balance = parseFiniteNumber(obj.balance);
  if (balance === null || balance < 0) {
    return { ok: false, error: `Jar "${name}" has an invalid balance.` };
  }

  let goal: number | undefined;
  if (obj.goal !== undefined && obj.goal !== null && obj.goal !== '') {
    const parsedGoal = parseFiniteNumber(obj.goal);
    if (parsedGoal === null || parsedGoal < 0) {
      return { ok: false, error: `Jar "${name}" has an invalid goal amount.` };
    }
    if (parsedGoal > 0) goal = Math.round(parsedGoal * 100) / 100;
  }

  const rawColor = typeof obj.color === 'string' ? (obj.color.trim() as JarColorKey) : 'yellow';
  const color: JarColorKey = VALID_JAR_COLORS.has(rawColor) ? rawColor : 'yellow';

  const rawCircles = Array.isArray(obj.circles) ? obj.circles : [];
  const validCircles: JarCircle[] = rawCircles
    .filter((c): c is JarCircle => {
      if (!c || typeof c !== 'object') return false;
      const circle = c as Record<string, unknown>;
      return (
        typeof circle.cx === 'number' &&
        typeof circle.cy === 'number' &&
        typeof circle.r === 'number' &&
        (circle.tone === 'light' || circle.tone === 'dark') &&
        typeof circle.opacity === 'number'
      );
    })
    .slice(0, 12);

  const circles =
    validCircles.length > 0 && validCircles.some((c) => c.r > 45)
      ? validCircles
      : generateCircles();

  const createdAt = isValidDateString(obj.createdAt)
    ? obj.createdAt
    : new Date().toISOString();

  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : makeImportId('jar', index);

  return {
    ok: true,
    jar: {
      id,
      name,
      color,
      balance: Math.round(balance * 100) / 100,
      goal,
      circles,
      createdAt,
    },
  };
}

function validateTransaction(
  raw: unknown,
  index: number,
  generateCircles: () => JarCircle[]
): { ok: true; tx: Transaction } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `Transaction #${index + 1} is not a valid object.` };
  }
  const obj = raw as Record<string, unknown>;

  const rawType = typeof obj.type === 'string' ? obj.type.trim() : '';
  if (!VALID_TX_TYPES.has(rawType as TransactionType)) {
    return {
      ok: false,
      error: `Transaction #${index + 1} has an invalid type ("${rawType || 'empty'}").`,
    };
  }
  const type = rawType as TransactionType;

  let category = typeof obj.category === 'string' ? obj.category.trim() : '';
  if (!category) {
    return { ok: false, error: `Transaction #${index + 1} is missing a category.` };
  }
  if ((type === 'jar_deposit' || type === 'jar_withdraw') && category === 'Piggy Bank') {
    category = 'Savings Jar';
  }

  const amount = parseFiniteNumber(obj.amount);
  if (amount === null || amount < 0) {
    return { ok: false, error: `Transaction #${index + 1} has an invalid amount.` };
  }

  let createdAt: string;
  if (obj.createdAt === undefined || obj.createdAt === null || obj.createdAt === '') {
    createdAt = new Date().toISOString();
  } else if (isValidDateString(obj.createdAt)) {
    createdAt = obj.createdAt;
  } else {
    return { ok: false, error: `Transaction #${index + 1} has an invalid date.` };
  }

  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : makeImportId('tx', index);

  const note =
    typeof obj.note === 'string' && obj.note.trim() ? obj.note.trim() : undefined;
  const jarId =
    typeof obj.jarId === 'string' && obj.jarId.trim() ? obj.jarId.trim() : undefined;
  const jarName =
    typeof obj.jarName === 'string' && obj.jarName.trim() ? obj.jarName.trim() : undefined;

  let closedJar: Jar | undefined;
  if (obj.closedJar !== undefined && obj.closedJar !== null) {
    const validatedClosed = validateJar(obj.closedJar, index, generateCircles);
    if (validatedClosed.ok) {
      closedJar = validatedClosed.jar;
    }
  }

  return {
    ok: true,
    tx: {
      id,
      type,
      category,
      note,
      jarId,
      jarName,
      closedJar,
      amount: Math.round(amount * 100) / 100,
      createdAt,
    },
  };
}

function validateCategory(
  raw: unknown,
  index: number
): { ok: true; cat: CategoryConfig } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `Category #${index + 1} is not a valid object.` };
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) {
    return { ok: false, error: `Category #${index + 1} is missing a name.` };
  }

  const kind = obj.kind === 'add' ? 'add' : obj.kind === 'spend' ? 'spend' : null;
  if (!kind) {
    return { ok: false, error: `Category "${name}" has an invalid kind.` };
  }

  const color =
    typeof obj.color === 'string' && obj.color.trim() ? obj.color.trim() : '#10B981';

  const parsedIsOthers = parseBooleanValue(obj.isOthers);
  const isOthers = parsedIsOthers ?? name.toLowerCase() === 'others';

  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : makeImportId('cat', index);

  return {
    ok: true,
    cat: {
      id,
      name,
      color,
      kind,
      ...(isOthers ? { isOthers: true } : {}),
    },
  };
}

export function parseImportedJSON(
  text: string,
  generateCircles: () => JarCircle[]
): ParseImportResult {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { ok: false, error: 'The JSON file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax. Please select a valid .json backup file.' };
  }

  // Support bare Transaction[] array or full/partial PersistedState object
  if (Array.isArray(parsed)) {
    const txs: Transaction[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const res = validateTransaction(parsed[i], i, generateCircles);
      if (!res.ok) return { ok: false, error: res.error };
      txs.push(res.tx);
    }
    return {
      ok: true,
      data: {
        format: 'json',
        transactions: txs,
        summaryCounts: {
          transactions: txs.length,
          jars: 0,
          categories: 0,
          hasSettings: false,
        },
      },
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Invalid JSON structure: expected a MeTime backup object.' };
  }

  const obj = parsed as Record<string, unknown>;
  const hasKnownKey =
    'transactions' in obj || 'jars' in obj || 'categories' in obj || 'settings' in obj;
  if (!hasKnownKey) {
    return {
      ok: false,
      error: 'Unrecognized JSON format. Expected transactions, jars, categories, or settings.',
    };
  }

  let transactions: Transaction[] | undefined;
  if ('transactions' in obj) {
    if (!Array.isArray(obj.transactions)) {
      return { ok: false, error: 'Invalid JSON: "transactions" must be an array.' };
    }
    transactions = [];
    for (let i = 0; i < obj.transactions.length; i++) {
      const res = validateTransaction(obj.transactions[i], i, generateCircles);
      if (!res.ok) return { ok: false, error: res.error };
      transactions.push(res.tx);
    }
  }

  let jars: Jar[] | undefined;
  if ('jars' in obj) {
    if (!Array.isArray(obj.jars)) {
      return { ok: false, error: 'Invalid JSON: "jars" must be an array.' };
    }
    jars = [];
    for (let i = 0; i < obj.jars.length; i++) {
      const res = validateJar(obj.jars[i], i, generateCircles);
      if (!res.ok) return { ok: false, error: res.error };
      jars.push(res.jar);
    }
  }

  let categories: CategoryConfig[] | undefined;
  if ('categories' in obj) {
    if (!Array.isArray(obj.categories)) {
      return { ok: false, error: 'Invalid JSON: "categories" must be an array.' };
    }
    categories = [];
    for (let i = 0; i < obj.categories.length; i++) {
      const res = validateCategory(obj.categories[i], i);
      if (!res.ok) return { ok: false, error: res.error };
      categories.push(res.cat);
    }
  }

  let settings: Partial<Settings> | undefined;
  if ('settings' in obj) {
    if (!obj.settings || typeof obj.settings !== 'object' || Array.isArray(obj.settings)) {
      return { ok: false, error: 'Invalid JSON: "settings" must be an object.' };
    }
    const rawSettings = obj.settings as Record<string, unknown> & { name?: unknown };
    settings = {};
    if (typeof rawSettings.username === 'string') {
      settings.username = rawSettings.username;
    } else if (typeof rawSettings.name === 'string' && rawSettings.name.trim() !== 'MeTime User') {
      settings.username = rawSettings.name;
    }
    if (typeof rawSettings.currency === 'string' && rawSettings.currency.trim()) {
      settings.currency = rawSettings.currency.trim();
    }
    if (rawSettings.startingBalance !== undefined) {
      const sb = parseFiniteNumber(rawSettings.startingBalance);
      if (sb === null) {
        return { ok: false, error: 'Invalid JSON: "settings.startingBalance" must be a number.' };
      }
      settings.startingBalance = Math.round(sb * 100) / 100;
    }
    if (rawSettings.hapticsEnabled !== undefined) {
      const haptics = parseBooleanValue(rawSettings.hapticsEnabled);
      if (haptics === null) {
        return { ok: false, error: 'Invalid JSON: "settings.hapticsEnabled" must be a boolean.' };
      }
      settings.hapticsEnabled = haptics;
    }
  }

  return {
    ok: true,
    data: {
      format: 'json',
      transactions,
      jars,
      categories,
      settings,
      summaryCounts: {
        transactions: transactions?.length ?? 0,
        jars: jars?.length ?? 0,
        categories: categories?.length ?? 0,
        hasSettings: Boolean(settings),
      },
    },
  };
}

/** RFC-4180 compliant CSV parser handling quoted commas, escaped quotes (""), and empty lines */
export function parseCSVRows(text: string): { rows: string[][]; error?: string } {
  const input = text.replace(/^\uFEFF/, '');
  if (!input.trim()) return { rows: [] };

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (field.length === 0) {
        inQuotes = true;
      } else {
        field += ch;
      }
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (input[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  if (inQuotes) {
    return { rows: [], error: 'Malformed CSV: unclosed quote detected.' };
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  return { rows };
}

export function parseImportedCSV(
  text: string,
  generateCircles: () => JarCircle[]
): ParseImportResult {
  const { rows, error } = parseCSVRows(text);
  if (error) {
    return { ok: false, error };
  }
  if (rows.length === 0) {
    return { ok: false, error: 'The CSV file is empty.' };
  }

  const headerMap = new Map<string, number>();
  rows[0].forEach((col, idx) => {
    const normalized = col.trim().toLowerCase();
    if (normalized && !headerMap.has(normalized)) {
      headerMap.set(normalized, idx);
    }
  });

  const requiredCols = ['type', 'category', 'amount'];
  const missingCols = requiredCols.filter((c) => !headerMap.has(c));
  if (missingCols.length > 0) {
    return {
      ok: false,
      error: `Invalid CSV headers: missing ${missingCols.join(', ')}. Expected MeTime CSV format (id, type, category, note, jarName, amount, createdAt).`,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, error: 'The CSV file contains headers but no transaction rows.' };
  }

  const getCol = (row: string[], key: string): string => {
    const idx = headerMap.get(key.toLowerCase());
    return idx !== undefined && idx < row.length ? row[idx] : '';
  };

  const transactions: Transaction[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const rawObj = {
      id: getCol(r, 'id'),
      type: getCol(r, 'type'),
      category: getCol(r, 'category'),
      note: getCol(r, 'note'),
      jarName: getCol(r, 'jarname'),
      amount: getCol(r, 'amount'),
      createdAt: getCol(r, 'createdat'),
    };
    const res = validateTransaction(rawObj, i, generateCircles);
    if (!res.ok) {
      return { ok: false, error: `CSV row ${i + 2}: ${res.error}` };
    }
    transactions.push(res.tx);
  }

  return {
    ok: true,
    data: {
      format: 'csv',
      transactions,
      summaryCounts: {
        transactions: transactions.length,
        jars: 0,
        categories: 0,
        hasSettings: false,
      },
    },
  };
}
