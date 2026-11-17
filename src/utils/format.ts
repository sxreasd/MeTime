import { AnalyticsPeriod, CategoryConfig, Transaction } from '../types/money';

export function formatCurrency(
  amount: number,
  currency = '₱',
  options?: { forceDecimals?: boolean; spaceAfterSymbol?: boolean }
): string {
  const space = options?.spaceAfterSymbol !== false ? ' ' : '';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const hasDecimals = options?.forceDecimals || Math.round(abs * 100) % 100 !== 0;

  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${currency}${space}${formatted}` : `${currency}${space}${formatted}`;
}

export function formatTxRowAmount(tx: Transaction, currency = '₱'): string {
  const abs = Math.abs(tx.amount);
  const hasDecimals = Math.round(abs * 100) % 100 !== 0;
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  const isPositive = tx.type === 'add' || tx.type === 'jar_withdraw';
  return isPositive ? `${formatted} ${currency}` : `-${formatted} ${currency}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function startOfWeekMonday(d: Date): Date {
  const date = startOfDay(d);
  const day = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function getDateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface ChartPoint {
  label: string;
  value: number;
  fullLabel: string;
}

export interface CategoryBreakdownItem {
  name: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface AnalyticsSnapshot {
  total: number;
  previousTotal: number;
  deltaPercent: number; // positive means spent MORE than last period, negative means spent LESS
  points: ChartPoint[];
  defaultSelectedIndex: number;
  breakdown: CategoryBreakdownItem[];
}

export function computeAnalytics(
  transactions: Transaction[],
  period: AnalyticsPeriod,
  spendCategories: CategoryConfig[],
  now = new Date()
): AnalyticsSnapshot {
  const spendTxs = transactions.filter((t) => t.type === 'spend');

  let currentStart: Date;
  let currentEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (period === 'today') {
    currentStart = startOfDay(now);
    currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 1);
    prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(currentStart);
  } else if (period === 'week') {
    currentStart = startOfWeekMonday(now);
    currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 7);
    prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(currentStart);
  } else {
    currentStart = startOfMonth(now);
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(currentStart);
  }

  const currentTxs = spendTxs.filter((t) => {
    const dt = new Date(t.createdAt);
    return dt >= currentStart && dt < currentEnd;
  });

  const previousTxs = spendTxs.filter((t) => {
    const dt = new Date(t.createdAt);
    return dt >= prevStart && dt < prevEnd;
  });

  const total = currentTxs.reduce((sum, t) => sum + t.amount, 0);
  const previousTotal = previousTxs.reduce((sum, t) => sum + t.amount, 0);

  let deltaPercent = 0;
  if (previousTotal > 0) {
    deltaPercent = ((total - previousTotal) / previousTotal) * 100;
  } else if (total > 0) {
    deltaPercent = 100;
  }

  // Build chart points
  let points: ChartPoint[] = [];
  let defaultSelectedIndex = 0;

  if (period === 'today') {
    // 8 3-hour buckets: 12a, 3a, 6a, 9a, 12p, 3p, 6p, 9p
    const labels = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];
    const fullLabels = [
      '12:00 AM - 3:00 AM',
      '3:00 AM - 6:00 AM',
      '6:00 AM - 9:00 AM',
      '9:00 AM - 12:00 PM',
      '12:00 PM - 3:00 PM',
      '3:00 PM - 6:00 PM',
      '6:00 PM - 9:00 PM',
      '9:00 PM - 12:00 AM',
    ];
    const buckets = new Array(8).fill(0);
    for (const tx of currentTxs) {
      const h = new Date(tx.createdAt).getHours();
      const idx = Math.min(7, Math.floor(h / 3));
      buckets[idx] += tx.amount;
    }
    points = labels.map((label, i) => ({
      label,
      value: buckets[i],
      fullLabel: fullLabels[i],
    }));
    defaultSelectedIndex = Math.min(7, Math.floor(now.getHours() / 3));
  } else if (period === 'week') {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = new Array(7).fill(0);
    for (const tx of currentTxs) {
      const d = new Date(tx.createdAt).getDay();
      const idx = d === 0 ? 6 : d - 1;
      buckets[idx] += tx.amount;
    }
    points = dayLabels.map((label, i) => ({
      label,
      value: buckets[i],
      fullLabel: label,
    }));
    const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    defaultSelectedIndex = todayIdx;
  } else {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const buckets = new Array(daysInMonth).fill(0);
    for (const tx of currentTxs) {
      const day = new Date(tx.createdAt).getDate();
      buckets[day - 1] += tx.amount;
    }
    points = buckets.map((val, i) => ({
      label: String(i + 1),
      value: val,
      fullLabel: `${now.toLocaleDateString('en-US', { month: 'short' })} ${i + 1}`,
    }));
    defaultSelectedIndex = Math.min(daysInMonth - 1, now.getDate() - 1);
  }

  // Category breakdown
  const catMap = new Map<string, { color: string; amount: number }>();
  for (const cat of spendCategories) {
    catMap.set(cat.name, { color: cat.color, amount: 0 });
  }
  for (const tx of currentTxs) {
    const existing = catMap.get(tx.category);
    if (existing) {
      existing.amount += tx.amount;
    } else {
      catMap.set(tx.category, { color: '#10B981', amount: tx.amount });
    }
  }

  const breakdown: CategoryBreakdownItem[] = Array.from(catMap.entries())
    .map(([name, data]) => ({
      name,
      color: data.color,
      amount: data.amount,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    total,
    previousTotal,
    deltaPercent,
    points,
    defaultSelectedIndex,
    breakdown,
  };
}

let audioCtx: AudioContext | null = null;

if (typeof window !== 'undefined') {
  const warmAudio = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass && !audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch {
      // Ignore audio warmup errors
    }
  };
  window.addEventListener('pointerdown', warmAudio, { once: true, passive: true });
}

export function triggerFeedback(enabled: boolean, type: 'tap' | 'confirm' | 'error' = 'tap') {
  if (!enabled) return;

  // Haptic vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'confirm') navigator.vibrate([18, 30, 28]);
      else if (type === 'error') navigator.vibrate([25, 25, 25]);
      else navigator.vibrate(8);
    } catch {
      // Ignore if blocked by browser policy
    }
  }

  // Subtle Web Audio tactile feedback
  if (typeof window !== 'undefined') {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (type === 'confirm') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // Ignore audio errors
    }
  }
}
