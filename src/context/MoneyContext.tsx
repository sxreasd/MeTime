import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CategoryConfig,
  Jar,
  JarCircle,
  JarColorKey,
  Settings,
  Transaction,
  TransactionType,
} from '../types/money';
import { ParsedImportPayload } from '../utils/dataTransfer';
import { isSameDay, startOfMonth, startOfWeekMonday } from '../utils/format';

const STORAGE_KEY = 'metime_money_tracker_v1';

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'cat_food', name: 'Food', color: '#F59E0B', kind: 'spend' },
  { id: 'cat_transport', name: 'Transport', color: '#3B82F6', kind: 'spend' },
  { id: 'cat_school', name: 'School Expenses', color: '#8B5CF6', kind: 'spend' },
  { id: 'cat_entertainment', name: 'Entertainment', color: '#EC4899', kind: 'spend' },
  { id: 'cat_spend_others', name: 'Others', color: '#10B981', kind: 'spend', isOthers: true },
  { id: 'cat_allowance', name: 'Allowance', color: '#F59E0B', kind: 'add' },
  { id: 'cat_add_others', name: 'Others', color: '#10B981', kind: 'add', isOthers: true },
];

export const DEFAULT_SETTINGS: Settings = {
  username: '',
  currency: '₱',
  startingBalance: 0,
  hapticsEnabled: true,
};

export function generateRandomJarCircles(): JarCircle[] {
  const count = 4 + Math.floor(Math.random() * 3); // 4..6 oversized circles
  const circles: JarCircle[] = [];
  for (let i = 0; i < count; i++) {
    // First two circles are guaranteed larger than card height (r: 95..160 -> dia 190..320 in 340x150 viewBox)
    const r =
      i < 2
        ? Math.round((95 + Math.random() * 65) * 10) / 10
        : Math.round((48 + Math.random() * 72) * 10) / 10;

    circles.push({
      cx: Math.round((-25 + Math.random() * 390) * 10) / 10,
      cy: Math.round((-25 + Math.random() * 200) * 10) / 10,
      r,
      tone: i % 2 === 0 ? 'light' : 'dark',
      opacity: Math.round((0.2 + Math.random() * 0.16) * 100) / 100,
    });
  }
  return circles;
}

interface PersistedState {
  transactions: Transaction[];
  jars: Jar[];
  categories: CategoryConfig[];
  settings: Settings;
}

function normalizeCategoryList(rawCats: CategoryConfig[]): CategoryConfig[] {
  const seenCatKeys = new Set<string>();
  const normalizedCats: CategoryConfig[] = [];
  for (const cat of rawCats) {
    const cleanName = typeof cat?.name === 'string' ? cat.name.trim() : '';
    const kind = cat?.kind === 'add' ? 'add' : 'spend';
    if (!cleanName) continue;
    const key = `${kind}:${cleanName.toLowerCase()}`;
    if (seenCatKeys.has(key)) continue;
    seenCatKeys.add(key);
    normalizedCats.push({
      ...cat,
      name: cleanName,
      kind,
      isOthers: Boolean(cat.isOthers || cleanName.toLowerCase() === 'others'),
    });
  }
  if (!normalizedCats.some((c) => c.kind === 'spend' && c.isOthers)) {
    normalizedCats.push({
      id: 'cat_spend_others',
      name: 'Others',
      color: '#10B981',
      kind: 'spend',
      isOthers: true,
    });
  }
  if (!normalizedCats.some((c) => c.kind === 'add' && c.isOthers)) {
    normalizedCats.push({
      id: 'cat_add_others',
      name: 'Others',
      color: '#10B981',
      kind: 'add',
      isOthers: true,
    });
  }
  return normalizedCats;
}

function getInitialState(): PersistedState {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState> & {
          settings?: Partial<Settings> & { name?: string };
        };

        const rawSettings: Partial<Settings> & { name?: string } = parsed.settings ?? {};
        const migratedUsername =
          typeof rawSettings.username === 'string'
            ? rawSettings.username
            : typeof rawSettings.name === 'string' && rawSettings.name.trim() !== 'MeTime User'
              ? rawSettings.name
              : '';

        const rawJars = Array.isArray(parsed.jars) ? parsed.jars : [];
        const migratedJars: Jar[] = rawJars.map((jar) => {
          const hasOversizedCircles =
            Array.isArray(jar.circles) &&
            jar.circles.length > 0 &&
            jar.circles.some((c) => c.r > 45);
          return {
            ...jar,
            circles: hasOversizedCircles ? jar.circles : generateRandomJarCircles(),
          };
        });

        const rawTxs = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        const migratedTxs: Transaction[] = rawTxs.map((tx) =>
          (tx.type === 'jar_deposit' || tx.type === 'jar_withdraw') && tx.category === 'Piggy Bank'
            ? { ...tx, category: 'Savings Jar' }
            : tx
        );

        const rawCats =
          Array.isArray(parsed.categories) && parsed.categories.length > 0
            ? parsed.categories
            : DEFAULT_CATEGORIES;
        const normalizedCats = normalizeCategoryList(rawCats);

        return {
          transactions: migratedTxs,
          jars: migratedJars,
          categories: normalizedCats,
          settings: {
            username: migratedUsername,
            currency:
              typeof rawSettings.currency === 'string' && rawSettings.currency
                ? rawSettings.currency
                : DEFAULT_SETTINGS.currency,
            startingBalance:
              typeof rawSettings.startingBalance === 'number' &&
              Number.isFinite(rawSettings.startingBalance)
                ? rawSettings.startingBalance
                : DEFAULT_SETTINGS.startingBalance,
            hapticsEnabled:
              typeof rawSettings.hapticsEnabled === 'boolean'
                ? rawSettings.hapticsEnabled
                : DEFAULT_SETTINGS.hapticsEnabled,
          },
        };
      }
    } catch {
      // Fall back to clean zero state
    }
  }
  return {
    transactions: [],
    jars: [],
    categories: DEFAULT_CATEGORIES,
    settings: DEFAULT_SETTINGS,
  };
}

export interface DeletedTxBackup {
  tx: Transaction;
  index: number;
}

export interface ImportDataSummary {
  transactionsAdded: number;
  jarsAdded: number;
  categoriesAdded: number;
  settingsUpdated: boolean;
  totalImported: number;
}

interface MoneyContextValue {
  transactions: Transaction[];
  jars: Jar[];
  categories: CategoryConfig[];
  spendCategories: CategoryConfig[];
  addCategories: CategoryConfig[];
  settings: Settings;
  balance: number;
  todaySpending: number;
  weekSpending: number;
  monthSpending: number;
  totalSavingsJar: number;
  addTransaction: (input: {
    type: TransactionType;
    category: string;
    note?: string;
    amount: number;
    jarId?: string;
    jarName?: string;
  }) => Transaction;
  deleteTransaction: (id: string) => DeletedTxBackup | null;
  restoreTransaction: (backup: DeletedTxBackup) => void;
  createJar: (input: { name: string; color: JarColorKey; goal?: number }) => Jar;
  updateJar: (id: string, updates: { name?: string; color?: JarColorKey; goal?: number }) => void;
  deleteJar: (id: string) => void;
  transferJarMoney: (jarId: string, direction: 'deposit' | 'withdraw', amount: number) => void;
  addCategory: (input: {
    name: string;
    color: string;
    kind: 'spend' | 'add';
  }) => CategoryConfig | null;
  updateCategory: (id: string, updates: { name?: string; color?: string }) => void;
  deleteCategory: (id: string) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  resetAllData: () => void;
  exportJSON: () => string;
  exportCSV: () => string;
  hasUserData: boolean;
  importData: (payload: ParsedImportPayload, mode: 'replace' | 'merge') => ImportDataSummary;
}

const MoneyContext = createContext<MoneyContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function MoneyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(getInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const spendCategories = useMemo(
    () => state.categories.filter((c) => c.kind === 'spend'),
    [state.categories]
  );

  const addCategories = useMemo(
    () => state.categories.filter((c) => c.kind === 'add'),
    [state.categories]
  );

  const { balance, todaySpending, weekSpending, monthSpending, totalSavingsJar } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const monthStart = startOfMonth(now);

    let bal = state.settings.startingBalance;
    let today = 0;
    let week = 0;
    let month = 0;

    for (const tx of state.transactions) {
      if (tx.type === 'add' || tx.type === 'jar_withdraw') {
        bal += tx.amount;
      } else if (tx.type === 'spend' || tx.type === 'jar_deposit') {
        bal -= tx.amount;
      }

      if (tx.type === 'spend') {
        const dt = new Date(tx.createdAt);
        if (isSameDay(dt, now)) today += tx.amount;
        if (dt >= weekStart) week += tx.amount;
        if (dt >= monthStart) month += tx.amount;
      }
    }

    const totalJar = state.jars.reduce((sum, j) => sum + j.balance, 0);

    return {
      balance: Math.round(bal * 100) / 100,
      todaySpending: Math.round(today * 100) / 100,
      weekSpending: Math.round(week * 100) / 100,
      monthSpending: Math.round(month * 100) / 100,
      totalSavingsJar: Math.round(totalJar * 100) / 100,
    };
  }, [state.settings.startingBalance, state.transactions, state.jars]);

  const addTransaction: MoneyContextValue['addTransaction'] = (input) => {
    const newTx: Transaction = {
      id: makeId('tx'),
      type: input.type,
      category: input.category,
      note: input.note?.trim() || undefined,
      jarId: input.jarId,
      jarName: input.jarName,
      amount: Math.round(input.amount * 100) / 100,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
    return newTx;
  };

  const deleteTransaction = (id: string): DeletedTxBackup | null => {
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const target = state.transactions[idx];

    setState((prev) => {
      const txIndex = prev.transactions.findIndex((t) => t.id === id);
      if (txIndex === -1) return prev;
      const tx = prev.transactions[txIndex];

      let nextJars = prev.jars;
      if (tx.type === 'jar_deposit' && tx.jarId) {
        nextJars = prev.jars.map((j) =>
          j.id === tx.jarId
            ? { ...j, balance: Math.max(0, Math.round((j.balance - tx.amount) * 100) / 100) }
            : j
        );
      } else if (tx.type === 'jar_withdraw' && tx.jarId) {
        const exists = prev.jars.some((j) => j.id === tx.jarId);
        if (exists) {
          nextJars = prev.jars.map((j) =>
            j.id === tx.jarId
              ? { ...j, balance: Math.round((j.balance + tx.amount) * 100) / 100 }
              : j
          );
        } else if (tx.closedJar) {
          nextJars = [...prev.jars, { ...tx.closedJar }];
        }
      }

      return {
        ...prev,
        jars: nextJars,
        transactions: prev.transactions.filter((t) => t.id !== id),
      };
    });

    return { tx: target, index: idx };
  };

  const restoreTransaction = (backup: DeletedTxBackup) => {
    const { tx, index } = backup;
    setState((prev) => {
      if (prev.transactions.some((t) => t.id === tx.id)) return prev;

      const nextTxs = [...prev.transactions];
      const insertAt = Math.min(Math.max(0, index), nextTxs.length);
      nextTxs.splice(insertAt, 0, tx);

      let nextJars = prev.jars;
      if (tx.type === 'jar_deposit' && tx.jarId) {
        nextJars = prev.jars.map((j) =>
          j.id === tx.jarId
            ? { ...j, balance: Math.round((j.balance + tx.amount) * 100) / 100 }
            : j
        );
      } else if (tx.type === 'jar_withdraw' && tx.jarId) {
        if (tx.closedJar) {
          nextJars = prev.jars.filter((j) => j.id !== tx.jarId);
        } else {
          nextJars = prev.jars.map((j) =>
            j.id === tx.jarId
              ? { ...j, balance: Math.max(0, Math.round((j.balance - tx.amount) * 100) / 100) }
              : j
          );
        }
      }

      return {
        ...prev,
        jars: nextJars,
        transactions: nextTxs,
      };
    });
  };

  const createJar: MoneyContextValue['createJar'] = (input) => {
    const jar: Jar = {
      id: makeId('jar'),
      name: input.name.trim(),
      color: input.color,
      balance: 0,
      goal: input.goal && input.goal > 0 ? Math.round(input.goal * 100) / 100 : undefined,
      circles: generateRandomJarCircles(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      jars: [...prev.jars, jar],
    }));
    return jar;
  };

  const updateJar: MoneyContextValue['updateJar'] = (id, updates) => {
    setState((prev) => ({
      ...prev,
      jars: prev.jars.map((j) =>
        j.id === id
          ? {
              ...j,
              name: updates.name !== undefined ? updates.name.trim() : j.name,
              color: updates.color !== undefined ? updates.color : j.color,
              goal:
                updates.goal !== undefined
                  ? updates.goal > 0
                    ? Math.round(updates.goal * 100) / 100
                    : undefined
                  : j.goal,
            }
          : j
      ),
    }));
  };

  const deleteJar = (id: string) => {
    setState((prev) => {
      const target = prev.jars.find((j) => j.id === id);
      if (!target) return prev;

      const nextTxs = [...prev.transactions];
      if (target.balance > 0) {
        nextTxs.unshift({
          id: makeId('tx'),
          type: 'jar_withdraw',
          category: 'Savings Jar',
          note: `Closed ${target.name}`,
          jarId: target.id,
          jarName: target.name,
          closedJar: { ...target },
          amount: target.balance,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        jars: prev.jars.filter((j) => j.id !== id),
        transactions: nextTxs,
      };
    });
  };

  const transferJarMoney: MoneyContextValue['transferJarMoney'] = (jarId, direction, amount) => {
    const cleanAmount = Math.round(amount * 100) / 100;
    if (cleanAmount <= 0) return;

    setState((prev) => {
      const target = prev.jars.find((j) => j.id === jarId);
      if (!target) return prev;

      const actualAmount =
        direction === 'withdraw' ? Math.min(cleanAmount, target.balance) : cleanAmount;
      if (actualAmount <= 0) return prev;

      const nextJars = prev.jars.map((j) =>
        j.id === jarId
          ? {
              ...j,
              balance:
                direction === 'deposit'
                  ? Math.round((j.balance + actualAmount) * 100) / 100
                  : Math.round((j.balance - actualAmount) * 100) / 100,
            }
          : j
      );

      const newTx: Transaction = {
        id: makeId('tx'),
        type: direction === 'deposit' ? 'jar_deposit' : 'jar_withdraw',
        category: 'Savings Jar',
        note:
          direction === 'deposit'
            ? `Saved to ${target.name}`
            : `From ${target.name}`,
        jarId: target.id,
        jarName: target.name,
        amount: actualAmount,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        jars: nextJars,
        transactions: [newTx, ...prev.transactions],
      };
    });
  };

  const addCategory: MoneyContextValue['addCategory'] = (input) => {
    const cleanName = input.name.trim();
    if (!cleanName) return null;

    const alreadyExists = state.categories.some(
      (c) => c.kind === input.kind && c.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (alreadyExists) return null;

    const newCat: CategoryConfig = {
      id: makeId('cat'),
      name: cleanName,
      color: input.color || '#10B981',
      kind: input.kind,
    };

    setState((prev) => {
      const dup = prev.categories.some(
        (c) => c.kind === input.kind && c.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (dup) return prev;

      const othersIdx = prev.categories.findIndex(
        (c) => c.kind === input.kind && (c.isOthers || c.name.toLowerCase() === 'others')
      );
      const next = [...prev.categories];
      if (othersIdx !== -1) {
        next.splice(othersIdx, 0, newCat);
      } else {
        next.push(newCat);
      }
      return { ...prev, categories: next };
    });

    return newCat;
  };

  const updateCategory: MoneyContextValue['updateCategory'] = (id, updates) => {
    setState((prev) => {
      const oldCat = prev.categories.find((c) => c.id === id);
      if (!oldCat) return prev;

      const isOthers = Boolean(oldCat.isOthers || oldCat.name.toLowerCase() === 'others');
      const rawNextName = updates.name?.trim();
      const canRename =
        !isOthers &&
        Boolean(rawNextName) &&
        rawNextName !== oldCat.name &&
        !prev.categories.some(
          (c) =>
            c.id !== id &&
            c.kind === oldCat.kind &&
            c.name.trim().toLowerCase() === rawNextName!.toLowerCase()
        );

      const finalName = canRename && rawNextName ? rawNextName : oldCat.name;

      const updatedCategories = prev.categories.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            name: finalName,
            color: updates.color || c.color,
          };
        }
        // Keep default "Others" color consistent everywhere across the app
        if (isOthers && updates.color && (c.isOthers || c.name.toLowerCase() === 'others')) {
          return { ...c, color: updates.color };
        }
        return c;
      });

      const updatedTransactions =
        finalName !== oldCat.name
          ? prev.transactions.map((t) =>
              t.category === oldCat.name &&
              ((oldCat.kind === 'spend' && t.type === 'spend') ||
                (oldCat.kind === 'add' && t.type === 'add'))
                ? { ...t, category: finalName }
                : t
            )
          : prev.transactions;

      return {
        ...prev,
        categories: updatedCategories,
        transactions: updatedTransactions,
      };
    });
  };

  const deleteCategory: MoneyContextValue['deleteCategory'] = (id) => {
    setState((prev) => {
      const target = prev.categories.find((c) => c.id === id);
      if (!target) return prev;
      if (target.isOthers || target.name.toLowerCase() === 'others') return prev;

      const fallback = prev.categories.find(
        (c) =>
          c.kind === target.kind &&
          c.id !== id &&
          (c.isOthers || c.name.toLowerCase() === 'others')
      );
      const fallbackName = fallback?.name || 'Others';

      const updatedTransactions = prev.transactions.map((t) =>
        t.category === target.name &&
        ((target.kind === 'spend' && t.type === 'spend') ||
          (target.kind === 'add' && t.type === 'add'))
          ? { ...t, category: fallbackName }
          : t
      );

      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        transactions: updatedTransactions,
      };
    });
  };

  const updateSettings: MoneyContextValue['updateSettings'] = (updates) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    }));
  };

  const resetAllData = () => {
    const clean: PersistedState = {
      transactions: [],
      jars: [],
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    };
    setState(clean);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const exportJSON = () => JSON.stringify(state, null, 2);

  const exportCSV = () => {
    const header = ['id', 'type', 'category', 'note', 'jarName', 'amount', 'createdAt'];
    const rows = state.transactions.map((t) =>
      [
        t.id,
        t.type,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        `"${(t.jarName || '').replace(/"/g, '""')}"`,
        t.amount,
        t.createdAt,
      ].join(',')
    );
    return [header.join(','), ...rows].join('\n');
  };

  const hasUserData = useMemo(() => {
    if (state.transactions.length > 0 || state.jars.length > 0) return true;
    if (state.settings.startingBalance !== 0 || state.settings.username.trim().length > 0) {
      return true;
    }
    if (state.categories.length !== DEFAULT_CATEGORIES.length) return true;
    return state.categories.some(
      (c, i) =>
        c.id !== DEFAULT_CATEGORIES[i]?.id ||
        c.name !== DEFAULT_CATEGORIES[i]?.name ||
        c.color !== DEFAULT_CATEGORIES[i]?.color
    );
  }, [state]);

  const sortTransactionsNewestFirst = (list: Transaction[]): Transaction[] =>
    [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const importData: MoneyContextValue['importData'] = (payload, mode) => {
    const incomingTxs = payload.transactions ?? [];
    const incomingJars = payload.jars ?? [];
    const incomingCats = payload.categories ?? [];

    if (mode === 'replace') {
      const dedupedTxs: Transaction[] = [];
      const seenTxIds = new Set<string>();
      for (const tx of incomingTxs) {
        if (seenTxIds.has(tx.id)) continue;
        seenTxIds.add(tx.id);
        dedupedTxs.push(tx);
      }

      const dedupedJars: Jar[] = [];
      const seenJarIds = new Set<string>();
      for (const jar of incomingJars) {
        if (seenJarIds.has(jar.id)) continue;
        seenJarIds.add(jar.id);
        dedupedJars.push(jar);
      }

      const nextTxs =
        payload.transactions !== undefined
          ? sortTransactionsNewestFirst(dedupedTxs)
          : state.transactions;
      const nextJars =
        payload.format === 'json' && payload.jars !== undefined ? dedupedJars : state.jars;
      const nextCategories =
        payload.format === 'json' && payload.categories !== undefined
          ? normalizeCategoryList(incomingCats)
          : state.categories;
      const nextSettings =
        payload.format === 'json' && payload.settings !== undefined
          ? { ...DEFAULT_SETTINGS, ...payload.settings }
          : state.settings;

      setState({
        transactions: nextTxs,
        jars: nextJars,
        categories: nextCategories,
        settings: nextSettings,
      });

      const txCount = payload.transactions !== undefined ? dedupedTxs.length : 0;
      const jarCount = payload.format === 'json' && payload.jars !== undefined ? dedupedJars.length : 0;
      const catCount =
        payload.format === 'json' && payload.categories !== undefined
          ? nextCategories.length
          : 0;
      const settingsUpdated = Boolean(payload.format === 'json' && payload.settings);

      return {
        transactionsAdded: txCount,
        jarsAdded: jarCount,
        categoriesAdded: catCount,
        settingsUpdated,
        totalImported: txCount + jarCount + catCount,
      };
    }

    // Merge / Append mode
    const existingTxIds = new Set(state.transactions.map((t) => t.id));
    const addedTxs: Transaction[] = [];
    for (const tx of incomingTxs) {
      if (existingTxIds.has(tx.id)) continue;
      existingTxIds.add(tx.id);
      addedTxs.push(tx);
    }

    const existingJarIds = new Set(state.jars.map((j) => j.id));
    const addedJars: Jar[] = [];
    for (const jar of incomingJars) {
      if (existingJarIds.has(jar.id)) continue;
      existingJarIds.add(jar.id);
      addedJars.push(jar);
    }

    const existingCatKeys = new Set(
      state.categories.map((c) => `${c.kind}:${c.name.trim().toLowerCase()}`)
    );
    const nextCategories = [...state.categories];
    let addedCatCount = 0;
    for (const cat of incomingCats) {
      const key = `${cat.kind}:${cat.name.trim().toLowerCase()}`;
      if (existingCatKeys.has(key)) continue;
      existingCatKeys.add(key);
      addedCatCount++;
      const othersIdx = nextCategories.findIndex(
        (c) => c.kind === cat.kind && (c.isOthers || c.name.toLowerCase() === 'others')
      );
      if (othersIdx !== -1) {
        nextCategories.splice(othersIdx, 0, cat);
      } else {
        nextCategories.push(cat);
      }
    }

    const mergedTxs = sortTransactionsNewestFirst([...addedTxs, ...state.transactions]);
    const mergedJars = [...state.jars, ...addedJars];

    setState({
      transactions: mergedTxs,
      jars: mergedJars,
      categories: nextCategories,
      settings: state.settings,
    });

    return {
      transactionsAdded: addedTxs.length,
      jarsAdded: addedJars.length,
      categoriesAdded: addedCatCount,
      settingsUpdated: false,
      totalImported: addedTxs.length + addedJars.length + addedCatCount,
    };
  };

  return (
    <MoneyContext.Provider
      value={{
        transactions: state.transactions,
        jars: state.jars,
        categories: state.categories,
        spendCategories,
        addCategories,
        settings: state.settings,
        balance,
        todaySpending,
        weekSpending,
        monthSpending,
        totalSavingsJar,
        addTransaction,
        deleteTransaction,
        restoreTransaction,
        createJar,
        updateJar,
        deleteJar,
        transferJarMoney,
        addCategory,
        updateCategory,
        deleteCategory,
        updateSettings,
        resetAllData,
        exportJSON,
        exportCSV,
        hasUserData,
        importData,
      }}
    >
      {children}
    </MoneyContext.Provider>
  );
}

export function useMoney() {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error('useMoney must be used inside MoneyProvider');
  return ctx;
}
