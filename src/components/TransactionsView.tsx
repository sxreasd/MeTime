import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ListFilter, Search, Trash2, X } from 'lucide-react';
import { useMoney } from '../context/MoneyContext';
import { Transaction } from '../types/money';
import {
  formatTimeShort,
  formatTxRowAmount,
  getDateGroupLabel,
  triggerFeedback,
} from '../utils/format';

export function TransactionsView() {
  const { transactions, categories, settings, deleteTransaction } = useMoney();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'spend' | 'add' | 'jar'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name, c.color));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter === 'spend' && tx.type !== 'spend') return false;
      if (typeFilter === 'add' && tx.type !== 'add') return false;
      if (typeFilter === 'jar' && tx.type !== 'jar_deposit' && tx.type !== 'jar_withdraw') {
        return false;
      }
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (q) {
        const hay = `${tx.category} ${tx.note || ''} ${tx.jarName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, searchQuery, typeFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Transaction[] }[] = [];
    for (const tx of filtered) {
      const label = getDateGroupLabel(tx.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(tx);
      } else {
        groups.push({ label, items: [tx] });
      }
    }
    return groups;
  }, [filtered]);

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0B0F10]">
      {/* Top-right radial teal glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-72 w-72 rounded-full opacity-75 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(24, 118, 128, 0.3) 0%, rgba(16, 72, 82, 0.12) 55%, rgba(11, 15, 16, 0) 75%)',
        }}
      />

      {/* Dark Header + Search */}
      <div className="relative z-10 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-bold tracking-tight text-white">Transactions</h1>
          <button
            type="button"
            aria-label="Toggle filters"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              setShowFilter((v) => !v);
            }}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] transition-colors active:scale-95 ${
              showFilter || hasActiveFilters
                ? 'bg-white text-[#0B0F10]'
                : 'bg-[#1C2124]/85 text-[#9CA3AF] hover:text-white'
            }`}
          >
            <ListFilter className="h-[18px] w-[18px]" />
            {hasActiveFilters && !showFilter && (
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#1ED82B]" />
            )}
          </button>
        </div>

        {/* Search Field */}
        <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[#1A1D21]/90 px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#8E959B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by category, note, or jar..."
            className="w-full bg-transparent text-[14px] text-white placeholder:text-[#6B7280] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#8E959B] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsible Filter Tray */}
        <AnimatePresence initial={false}>
          {showFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 rounded-2xl border border-white/[0.06] bg-[#1A1D21]/90 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'spend', label: 'Spend' },
                      { id: 'add', label: 'Add' },
                      { id: 'jar', label: 'Jars' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTypeFilter(t.id);
                        if (t.id !== 'all') setCategoryFilter('all');
                      }}
                      className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                        typeFilter === t.id
                          ? 'bg-white text-[#0B0F10]'
                          : 'bg-white/[0.06] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      categoryFilter === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-white/[0.04] text-[#8E959B]'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.name)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        categoryFilter === cat.name
                          ? 'bg-white text-[#0B0F10]'
                          : 'bg-white/[0.05] text-[#C8CFD5]'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* White Grouped Transactions Sheet */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-t-[32px] bg-white text-[#111827]">
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 pt-5 pb-28">
          {grouped.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <p className="text-[15px] font-semibold text-[#111827]">
                {transactions.length === 0 ? 'No transactions recorded' : 'No matching entries'}
              </p>
              <p className="mt-1 max-w-[230px] text-[13px] text-gray-400">
                {transactions.length === 0
                  ? 'Your spending, income, and jar transfers will appear here grouped by date.'
                  : 'Try clearing your search or filter selections.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <section key={group.label}>
                  <h2 className="mb-2 text-[12px] font-semibold tracking-wide text-gray-400 uppercase">
                    {group.label}
                  </h2>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((tx) => {
                      const isPositive = tx.type === 'add' || tx.type === 'jar_withdraw';
                      const dotColor =
                        tx.type === 'jar_deposit' || tx.type === 'jar_withdraw'
                          ? '#4DABFF'
                          : categoryColorMap.get(tx.category) || '#10B981';

                      return (
                        <div
                          key={tx.id}
                          className="group flex min-h-[56px] items-center justify-between py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-3 pr-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: dotColor }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-medium text-[#111827]">
                                {tx.note || tx.category}
                              </p>
                              <p className="text-[12px] text-gray-400">
                                {tx.note ? `${tx.category} · ` : ''}
                                {formatTimeShort(tx.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`text-[15px] tabular-nums ${
                                isPositive
                                  ? 'font-bold text-[#16A34A]'
                                  : 'font-semibold text-[#111827]'
                              }`}
                            >
                              {formatTxRowAmount(tx, settings.currency)}
                            </span>
                            <button
                              type="button"
                              aria-label="Delete transaction"
                              onClick={() => {
                                triggerFeedback(settings.hapticsEnabled, 'tap');
                                deleteTransaction(tx.id);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
