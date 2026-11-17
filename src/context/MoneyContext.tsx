import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CategoryConfig,
  Jar,
  JarColorKey,
  Settings,
  Transaction,
  TransactionType,
} from '../types/money';
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
  name: 'MeTime User',
  currency: '₱',
  startingBalance: 0,
  hapticsEnabled: true,
};

interface PersistedState {
  transactions: Transaction[];
  jars: Jar[];
  categories: CategoryConfig[];
  settings: Settings;
}

function getInitialState(): PersistedState {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        return {
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          jars: Array.isArray(parsed.jars) ? parsed.jars : [],
          categories:
            Array.isArray(parsed.categories) && parsed.categories.length > 0
              ? parsed.categories
              : DEFAULT_CATEGORIES,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
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
  totalPiggyBank: number;
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
  updateCategory: (id: string, updates: { name?: string; color?: string }) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  resetAllData: () => void;
  exportJSON: () => string;
  exportCSV: () => string;
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

  const { balance, todaySpending, weekSpending, monthSpending, totalPiggyBank } = useMemo(() => {
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

    const piggy = state.jars.reduce((sum, j) => sum + j.balance, 0);

    return {
      balance: Math.round(bal * 100) / 100,
      todaySpending: Math.round(today * 100) / 100,
      weekSpending: Math.round(week * 100) / 100,
      monthSpending: Math.round(month * 100) / 100,
      totalPiggyBank: Math.round(piggy * 100) / 100,
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
          category: 'Piggy Bank',
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
        category: 'Piggy Bank',
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

  const updateCategory: MoneyContextValue['updateCategory'] = (id, updates) => {
    setState((prev) => {
      const oldCat = prev.categories.find((c) => c.id === id);
      const nextName = updates.name?.trim();
      const updatedCategories = prev.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              name: nextName && nextName.length > 0 ? nextName : c.name,
              color: updates.color || c.color,
            }
          : c
      );

      // Keep historical transaction category names synced if renamed
      const updatedTransactions =
        oldCat && nextName && nextName.length > 0 && nextName !== oldCat.name
          ? prev.transactions.map((t) =>
              t.category === oldCat.name &&
              ((oldCat.kind === 'spend' && t.type === 'spend') ||
                (oldCat.kind === 'add' && t.type === 'add'))
                ? { ...t, category: nextName }
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
        totalPiggyBank,
        addTransaction,
        deleteTransaction,
        restoreTransaction,
        createJar,
        updateJar,
        deleteJar,
        transferJarMoney,
        updateCategory,
        updateSettings,
        resetAllData,
        exportJSON,
        exportCSV,
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
