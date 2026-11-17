import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ListFilter, Search, Settings, X } from 'lucide-react';
import { useMoney } from '../context/MoneyContext';
import { AppScreen, Transaction } from '../types/money';
import { formatTxRowAmount, triggerFeedback } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

interface HomeProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenEntry: (mode: 'spend' | 'add') => void;
}

export function Home({ onNavigate, onOpenEntry }: HomeProps) {
  const {
    balance,
    todaySpending,
    totalPiggyBank,
    transactions,
    categories,
    settings,
  } = useMoney();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'spend' | 'add' | 'jar'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isNegative = balance < 0;

  const filteredTransactions = useMemo(() => {
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

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all';

  const getRowTitle = (tx: Transaction) => {
    if (tx.note) return tx.note;
    return tx.category;
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0B0F10]">
      {/* Top-right radial teal glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-72 w-72 rounded-full opacity-80 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(24, 118, 128, 0.34) 0%, rgba(16, 72, 82, 0.14) 55%, rgba(11, 15, 16, 0) 75%)',
        }}
      />

      {/* Top Dark Section */}
      <div className="relative z-10 px-6 pt-6 pb-5">
        {/* Header */}
        <header className="relative flex h-11 items-center justify-center">
          <h1 className="text-[17px] font-semibold tracking-tight text-white">Home</h1>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onNavigate('settings');
            }}
            className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-[#1C2124]/85 text-[#9CA3AF] transition-all hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <Settings className="h-[19px] w-[19px]" />
          </button>
        </header>

        {/* Balance */}
        <div className="mt-5">
          <p className="text-[13px] font-medium text-[#8E959B]">Balance</p>
          <div className="mt-1 flex items-baseline gap-2">
            <AnimatedNumber
              value={balance}
              currency={settings.currency}
              className={`text-[40px] leading-[1.1] font-bold tracking-tight transition-colors duration-300 ${
                isNegative ? 'text-[#FF6B6B]' : 'text-white'
              }`}
            />
          </div>

          {/* Spend / Add Pills */}
          <div className="mt-4 flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 700, damping: 32 }}
              onClick={() => {
                triggerFeedback(settings.hapticsEnabled, 'tap');
                onOpenEntry('spend');
              }}
              className="min-h-[44px] rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#0B0F10] shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Spend
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 700, damping: 32 }}
              onClick={() => {
                triggerFeedback(settings.hapticsEnabled, 'tap');
                onOpenEntry('add');
              }}
              className="min-h-[44px] rounded-full border border-white/[0.07] bg-[#1C2124]/90 px-7 py-2.5 text-[14px] font-medium text-[#C8CFD5] hover:bg-[#242A2E] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Add
            </motion.button>
          </div>
        </div>

        {/* Two Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3.5">
          {/* Today's Spending Card */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 700, damping: 32 }}
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onNavigate('analytics');
            }}
            className="flex flex-col justify-between rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-4 text-left backdrop-blur-md hover:bg-[#1F2328] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <span className="text-[12px] font-medium text-[#8E959B]">Today&apos;s Spending</span>
            <AnimatedNumber
              value={todaySpending}
              currency={settings.currency}
              className="mt-2 block text-[20px] font-bold tracking-tight text-white"
            />
          </motion.button>

          {/* Piggy Bank Card */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 700, damping: 32 }}
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onNavigate('piggy');
            }}
            className="flex items-center justify-between gap-2 rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-4 text-left backdrop-blur-md hover:bg-[#1F2328] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <div className="min-w-0">
              <span className="block text-[12px] font-medium text-[#8E959B]">Piggy Bank</span>
              <AnimatedNumber
                value={totalPiggyBank}
                currency={settings.currency}
                className="mt-2 block truncate text-[20px] font-bold tracking-tight text-white"
              />
            </div>

            {/* Layered Colored Wallet Icon from Figma */}
            <div
              aria-hidden="true"
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px] shadow-[0_6px_18px_rgba(37,99,235,0.42)]"
            >
              <div className="h-[22%] w-full bg-[#FFE226]" />
              <div className="h-[20%] w-full bg-[#F43F5E]" />
              <div className="h-[58%] w-full bg-[#2563EB]" />
            </div>
          </motion.button>
        </div>
      </div>

      {/* Bottom White Transactions Panel */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-t-[32px] bg-white text-[#111827] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button
            type="button"
            aria-label="Filter transactions"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              setShowFilter((v) => !v);
            }}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100 active:scale-95 ${
              hasActiveFilters || showFilter ? 'text-[#111827] bg-gray-100' : 'text-[#64748B]'
            }`}
          >
            <ListFilter className="h-5 w-5" />
            {hasActiveFilters && (
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#1ED82B]" />
            )}
          </button>

          <h2 className="text-[16px] font-bold tracking-tight text-[#111827]">Transactions</h2>

          <button
            type="button"
            aria-label="Search transactions"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              setShowSearch((v) => {
                if (v) setSearchQuery('');
                return !v;
              });
            }}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100 active:scale-95 ${
              showSearch ? 'text-[#111827] bg-gray-100' : 'text-[#64748B]'
            }`}
          >
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>

        {/* Collapsible Search Bar */}
        <AnimatePresence initial={false}>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-6"
            >
              <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#F3F4F6] px-3.5 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search category or note..."
                  className="w-full bg-transparent text-[14px] text-[#111827] placeholder:text-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsible Filter Controls */}
        <AnimatePresence initial={false}>
          {showFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-6"
            >
              <div className="mb-3 space-y-2 rounded-2xl bg-[#F8FAFC] p-3 border border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'spend', label: 'Spend' },
                      { id: 'add', label: 'Add' },
                      { id: 'jar', label: 'Jars' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setTypeFilter(tab.id);
                        if (tab.id !== 'all') setCategoryFilter('all');
                      }}
                      className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                        typeFilter === tab.id
                          ? 'bg-[#111827] text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-gray-200 text-[#111827]'
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.name)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        categoryFilter === cat.name
                          ? 'bg-[#111827] text-white'
                          : 'bg-white text-gray-600 border border-gray-200'
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

        {/* Scrollable List */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-24">
          {filteredTransactions.length === 0 ? (
            <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center px-4 pb-8">
              <p className="text-[15px] font-semibold text-[#111827]">
                {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
              </p>
              <p className="mt-1 max-w-[240px] text-[13px] text-gray-400">
                {transactions.length === 0
                  ? 'Tap Spend or Add above to record your first entry.'
                  : 'Try adjusting your search or category filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/70">
              <AnimatePresence initial={false}>
                {filteredTransactions.map((tx) => {
                  const isPositive = tx.type === 'add' || tx.type === 'jar_withdraw';
                  return (
                    <motion.div
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="flex min-h-[52px] items-center justify-between py-3"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="truncate text-[15px] font-normal text-[#1F2937]">
                          {getRowTitle(tx)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[15px] tabular-nums ${
                          isPositive
                            ? 'font-bold text-[#16A34A]'
                            : 'font-medium text-[#1F2937]'
                        }`}
                      >
                        {formatTxRowAmount(tx, settings.currency)}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
