import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  animate,
  AnimatePresence,
  motion,
  PanInfo,
  useDragControls,
  useMotionValue,
  useTransform,
  Variants,
} from 'motion/react';
import { ListFilter, Search, Settings, X } from 'lucide-react';
import { DeletedTxBackup, useMoney } from '../context/MoneyContext';
import { AppScreen, Transaction } from '../types/money';
import {
  getDateGroupLabel,
  isSameDay,
  startOfMonth,
  startOfWeekMonday,
  triggerFeedback,
} from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { INTRO_TIMING, IntroStage } from './IntroSequence';
import { SwipeableTransactionRow } from './SwipeableTransactionRow';

interface HomeProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenEntry: (mode: 'spend' | 'add') => void;
  introStage?: IntroStage;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

const skipTransition = {
  duration: INTRO_TIMING.skipFadeDuration,
  ease: 'easeOut' as const,
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: -44 },
  reveal: {
    opacity: 1,
    y: 0,
    transition: {
      duration: INTRO_TIMING.home.headerTitleDuration,
      delay: INTRO_TIMING.home.headerTitleDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, y: 0, transition: skipTransition },
};

const gearVariants: Variants = {
  hidden: { opacity: 0, x: 44, y: -22 },
  reveal: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: INTRO_TIMING.home.headerGearDuration,
      delay: INTRO_TIMING.home.headerGearDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, x: 0, y: 0, transition: skipTransition },
};

const balanceVariants: Variants = {
  hidden: { opacity: 0, x: -56 },
  reveal: {
    opacity: 1,
    x: 0,
    transition: {
      duration: INTRO_TIMING.home.balanceDuration,
      delay: INTRO_TIMING.home.balanceDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, x: 0, transition: skipTransition },
};

const spendPillVariants: Variants = {
  hidden: { opacity: 0, y: 44 },
  reveal: {
    opacity: 1,
    y: 0,
    transition: {
      duration: INTRO_TIMING.home.pillDuration,
      delay: INTRO_TIMING.home.spendPillDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, y: 0, transition: skipTransition },
};

const addPillVariants: Variants = {
  hidden: { opacity: 0, y: 44 },
  reveal: {
    opacity: 1,
    y: 0,
    transition: {
      duration: INTRO_TIMING.home.pillDuration,
      delay: INTRO_TIMING.home.addPillDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, y: 0, transition: skipTransition },
};

const leftCardVariants: Variants = {
  hidden: { opacity: 0, x: -56 },
  reveal: {
    opacity: 1,
    x: 0,
    transition: {
      duration: INTRO_TIMING.home.cardsDuration,
      delay: INTRO_TIMING.home.cardsDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, x: 0, transition: skipTransition },
};

const rightCardVariants: Variants = {
  hidden: { opacity: 0, x: 56 },
  reveal: {
    opacity: 1,
    x: 0,
    transition: {
      duration: INTRO_TIMING.home.cardsDuration,
      delay: INTRO_TIMING.home.cardsDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, x: 0, transition: skipTransition },
};

const panelRiseVariants: Variants = {
  hidden: { opacity: 0, y: 76 },
  reveal: {
    opacity: 1,
    y: 0,
    transition: {
      duration: INTRO_TIMING.home.panelDuration,
      delay: INTRO_TIMING.home.panelDelay,
      ease: INTRO_TIMING.home.ease,
    },
  },
  settled: { opacity: 1, y: 0, transition: skipTransition },
};

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function Home({
  onNavigate,
  onOpenEntry,
  introStage = 'settled',
  registerBackHandler,
}: HomeProps) {
  const {
    balance,
    todaySpending,
    totalPiggyBank,
    transactions,
    categories,
    settings,
    deleteTransaction,
    restoreTransaction,
  } = useMoney();

  // Panel expansion state
  const [isExpanded, setIsExpanded] = useState(false);

  // Expanded-only Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'spend' | 'add' | 'jar'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Swipe-to-delete state
  const [openSwipeTxId, setOpenSwipeTxId] = useState<string | null>(null);
  const [undoBackup, setUndoBackup] = useState<DeletedTxBackup | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Layout measurement refs for 60fps Y-transform snapping
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const expandedHeaderRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [collapsedY, setCollapsedY] = useState(348);
  const [expandedY, setExpandedY] = useState(148);
  const [containerHeight, setContainerHeight] = useState(800);

  const panelY = useMotionValue(348);
  const panelDragControls = useDragControls();
  const handleDownRef = useRef<{ y: number; time: number } | null>(null);
  const listPointerDownRef = useRef<{ x: number; y: number; startedDrag: boolean } | null>(null);

  // Measure hero & fixed expanded header heights dynamically (keyboard-safe)
  useEffect(() => {
    const updateMetrics = () => {
      const rootH = rootRef.current?.clientHeight || 800;
      const heroH = heroRef.current?.offsetHeight || 348;
      const expH = expandedHeaderRef.current?.offsetHeight || 148;
      setContainerHeight(rootH);
      // Avoid overwriting collapsedY with transient keyboard-shrunk metrics when expanded
      setCollapsedY((prev) => (isExpanded ? prev : heroH));
      setExpandedY(expH);
    };

    updateMetrics();
    const ro = new ResizeObserver(updateMetrics);
    if (rootRef.current) ro.observe(rootRef.current);
    if (heroRef.current) ro.observe(heroRef.current);
    if (expandedHeaderRef.current) ro.observe(expandedHeaderRef.current);
    return () => ro.disconnect();
  }, [isExpanded]);

  // Keep panelY synced to collapsedY / expandedY when measurements update or state toggles
  useEffect(() => {
    const target = isExpanded ? expandedY : collapsedY;
    const controls = animate(panelY, target, {
      type: 'spring',
      stiffness: 360,
      damping: 34,
      mass: 0.85,
    });
    return () => controls.stop();
  }, [isExpanded, collapsedY, expandedY, panelY]);

  // Derived 60fps progress & transforms (0 = collapsed, 1 = expanded)
  const safeExpandedY = Math.min(expandedY, collapsedY - 40);
  const progress = useTransform(panelY, [safeExpandedY, collapsedY], [1, 0]);
  const heroOpacity = useTransform(progress, [0, 0.55], [1, 0]);
  const heroY = useTransform(progress, [0, 1], [0, -44]);
  const heroScale = useTransform(progress, [0, 1], [1, 0.94]);

  // Expanded header stays strictly hidden (opacity 0) until panel nears top (>55% progress)
  const expHeaderOpacity = useTransform(progress, [0.55, 0.96], [0, 1]);
  const expHeaderY = useTransform(progress, [0.45, 1], [20, 0]);
  const panelTopRadius = useTransform(progress, [0, 1], [32, 20]);

  // Register Back button handler:
  // 1. Close filter popover if open
  // 2. Close/blur search if active or non-empty
  // 3. Collapse expanded panel on next back press
  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (showFilter) {
        setShowFilter(false);
        return true;
      }
      if (searchFocused || searchQuery.trim().length > 0) {
        searchInputRef.current?.blur();
        setSearchFocused(false);
        setSearchQuery('');
        return true;
      }
      if (isExpanded) {
        setIsExpanded(false);
        setOpenSwipeTxId(null);
        return true;
      }
      return false;
    });
    return () => registerBackHandler(null);
  }, [isExpanded, showFilter, searchFocused, searchQuery, registerBackHandler]);

  // Reset filter/search cleanly when collapsing back to Home
  useEffect(() => {
    if (!isExpanded) {
      setShowFilter(false);
      setSearchFocused(false);
    }
  }, [isExpanded]);

  const isNegative = balance < 0;

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name, c.color));
    return map;
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    // Collapsed view always shows the clean full chronological list; filtering/searching applies in expanded view
    if (!isExpanded) return transactions;

    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const monthStart = startOfMonth(now);

    return transactions.filter((tx) => {
      if (typeFilter === 'spend' && tx.type !== 'spend') return false;
      if (typeFilter === 'add' && tx.type !== 'add') return false;
      if (typeFilter === 'jar' && tx.type !== 'jar_deposit' && tx.type !== 'jar_withdraw') {
        return false;
      }
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      if (dateRange !== 'all') {
        const dt = new Date(tx.createdAt);
        if (dateRange === 'today' && !isSameDay(dt, now)) return false;
        if (dateRange === 'week' && dt < weekStart) return false;
        if (dateRange === 'month' && dt < monthStart) return false;
        if (dateRange === 'custom') {
          if (customFrom) {
            const fromDt = new Date(`${customFrom}T00:00:00`);
            if (dt < fromDt) return false;
          }
          if (customTo) {
            const toDt = new Date(`${customTo}T23:59:59.999`);
            if (dt > toDt) return false;
          }
        }
      }

      if (q) {
        const hay = `${tx.category} ${tx.note || ''} ${tx.jarName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [isExpanded, transactions, searchQuery, typeFilter, categoryFilter, dateRange, customFrom, customTo]);

  const groupedTransactions = useMemo(() => {
    const groups: { label: string; items: Transaction[] }[] = [];
    for (const tx of filteredTransactions) {
      const label = getDateGroupLabel(tx.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(tx);
      } else {
        groups.push({ label, items: [tx] });
      }
    }
    return groups;
  }, [filteredTransactions]);

  const hasActiveFilters =
    typeFilter !== 'all' || categoryFilter !== 'all' || dateRange !== 'all';

  const handlePanelDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const travel = Math.max(80, collapsedY - expandedY);
    const currentY = panelY.get();
    let nextExpanded = isExpanded;

    if (!isExpanded) {
      if (currentY < collapsedY - travel * 0.3 || info.velocity.y < -320) {
        nextExpanded = true;
      }
    } else {
      if (currentY > expandedY + travel * 0.3 || info.velocity.y > 320) {
        nextExpanded = false;
      }
    }

    setOpenSwipeTxId(null);
    if (nextExpanded !== isExpanded) {
      triggerFeedback(settings.hapticsEnabled, 'tap');
      setIsExpanded(nextExpanded);
    } else {
      animate(panelY, isExpanded ? expandedY : collapsedY, {
        type: 'spring',
        stiffness: 360,
        damping: 34,
        mass: 0.85,
      });
    }
  };

  const handleDeleteTx = useCallback(
    (id: string) => {
      setOpenSwipeTxId(null);
      const backup = deleteTransaction(id);
      if (!backup) return;

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoBackup(backup);
      undoTimerRef.current = setTimeout(() => {
        setUndoBackup(null);
      }, 4000);
    },
    [deleteTransaction]
  );

  const handleUndoDelete = () => {
    if (!undoBackup) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    restoreTransaction(undoBackup);
    setUndoBackup(null);
    triggerFeedback(settings.hapticsEnabled, 'tap');
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const clearAllFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setDateRange('all');
    setCustomFrom('');
    setCustomTo('');
  };

  const getDotColor = (tx: Transaction) =>
    tx.type === 'jar_deposit' || tx.type === 'jar_withdraw'
      ? '#4DABFF'
      : categoryColorMap.get(tx.category) || '#10B981';

  return (
    <motion.div
      ref={rootRef}
      initial={introStage === 'hidden' ? 'hidden' : false}
      animate={introStage}
      className="relative h-full w-full overflow-hidden bg-transparent"
    >
      {/* LAYER A: Top Dark Home Hero (fades/scales/translates up as panel expands) */}
      <motion.div
        ref={heroRef}
        style={{
          opacity: heroOpacity,
          y: heroY,
          scale: heroScale,
          paddingTop: 'max(1.35rem, env(safe-area-inset-top))',
        }}
        className={`relative z-10 px-6 pb-5 ${
          isExpanded ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <header className="relative flex h-11 items-center justify-center">
          <motion.h1
            variants={titleVariants}
            className="text-[17px] font-semibold tracking-tight text-white"
          >
            Home
          </motion.h1>
          <motion.button
            variants={gearVariants}
            whileTap={{ scale: 0.94 }}
            type="button"
            aria-label="Settings"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onNavigate('settings');
            }}
            className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#1C2124]/75 text-[#9CA3AF] backdrop-blur-md transition-colors duration-100 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <Settings className="h-[19px] w-[19px]" />
          </motion.button>
        </header>

        {/* Balance */}
        <div className="mt-5">
          <motion.div variants={balanceVariants}>
            <p className="text-[13px] font-medium text-[#8E959B]">Balance</p>
            <div className="mt-1 flex items-baseline gap-2">
              <AnimatedNumber
                value={balance}
                currency={settings.currency}
                holdAtZero={introStage === 'hidden'}
                countDelay={INTRO_TIMING.home.balanceDelay}
                countDuration={INTRO_TIMING.home.balanceCountDuration}
                className={`text-[40px] leading-[1.1] font-bold tracking-tight transition-colors duration-300 ${
                  isNegative ? 'text-[#FF6B6B]' : 'text-white'
                }`}
              />
            </div>
          </motion.div>

          {/* Spend / Add Pills */}
          <div className="mt-4 flex items-center gap-3">
            <motion.button
              variants={spendPillVariants}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerFeedback(settings.hapticsEnabled, 'tap');
                onOpenEntry('spend');
              }}
              className="min-h-[44px] rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#0B0F10] shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Spend
            </motion.button>
            <motion.button
              variants={addPillVariants}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerFeedback(settings.hapticsEnabled, 'tap');
                onOpenEntry('add');
              }}
              className="min-h-[44px] rounded-full border border-white/[0.08] bg-[#1C2124]/80 px-7 py-2.5 text-[14px] font-medium text-[#C8CFD5] backdrop-blur-md hover:bg-[#242A2E] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Add
            </motion.button>
          </div>
        </div>

        {/* Two Summary Cards (parallel horizontal lanes, no crossing) */}
        <div className="mt-6 grid grid-cols-2 gap-3.5">
          <motion.button
            variants={leftCardVariants}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onNavigate('analytics');
            }}
            className="flex flex-col justify-between rounded-[24px] border border-white/[0.07] bg-[#1A1D21]/80 p-4 text-left backdrop-blur-md hover:bg-[#1F2328]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <span className="text-[12px] font-medium text-[#8E959B]">Today&apos;s Spending</span>
            <AnimatedNumber
              value={todaySpending}
              currency={settings.currency}
              holdAtZero={introStage === 'hidden'}
              countDelay={INTRO_TIMING.home.cardsDelay}
              countDuration={INTRO_TIMING.home.cardsDuration}
              className="mt-2 block text-[20px] font-bold tracking-tight text-white"
            />
          </motion.button>

          <motion.button
            variants={rightCardVariants}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onNavigate('piggy');
            }}
            className="flex items-center justify-between gap-2 rounded-[24px] border border-white/[0.07] bg-[#1A1D21]/80 p-4 text-left backdrop-blur-md hover:bg-[#1F2328]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <div className="min-w-0">
              <span className="block text-[12px] font-medium text-[#8E959B]">Piggy Bank</span>
              <AnimatedNumber
                value={totalPiggyBank}
                currency={settings.currency}
                holdAtZero={introStage === 'hidden'}
                countDelay={INTRO_TIMING.home.cardsDelay}
                countDuration={INTRO_TIMING.home.cardsDuration}
                className="mt-2 block truncate text-[20px] font-bold tracking-tight text-white"
              />
            </div>

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
      </motion.div>

      {/* LAYER B: Expanded-Only Dark Transactions Header (hidden & non-interactive while collapsed) */}
      <motion.div
        ref={expandedHeaderRef}
        aria-hidden={!isExpanded}
        style={{
          opacity: expHeaderOpacity,
          y: expHeaderY,
          paddingTop: 'max(1.35rem, env(safe-area-inset-top))',
        }}
        className={`absolute inset-x-0 top-0 z-10 px-6 pb-4 ${
          isExpanded ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Title row (draggable down to collapse; Filter button stops propagation) */}
        <div
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            panelDragControls.start(e);
          }}
          className="flex cursor-grab touch-none items-center justify-between active:cursor-grabbing"
        >
          <h2 className="text-[24px] font-bold tracking-tight text-white">Transactions</h2>
          <button
            type="button"
            aria-label="Toggle filters"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerFeedback(settings.hapticsEnabled, 'tap');
              setShowFilter((v) => !v);
            }}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] transition-colors active:scale-95 ${
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

        {/* Search bar on dark background — isolated from panel drag */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-[#1A1D21]/85 px-4 py-2.5 backdrop-blur-md"
        >
          <Search className="h-4 w-4 shrink-0 text-[#8E959B]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onPointerDown={(e) => e.stopPropagation()}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by category, note, or jar..."
            className="w-full bg-transparent text-[14px] text-white placeholder:text-[#6B7280] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setSearchQuery('')}
              className="text-[#8E959B] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* LAYER C: Expandable White Transactions Panel */}
      <motion.div
        variants={panelRiseVariants}
        className="pointer-events-none absolute inset-0 z-20"
      >
        <motion.div
          drag="y"
          dragControls={panelDragControls}
          dragListener={false}
          dragConstraints={{ top: safeExpandedY, bottom: collapsedY }}
          dragElastic={0.14}
          dragMomentum={false}
          style={{
            y: panelY,
            borderTopLeftRadius: panelTopRadius,
            borderTopRightRadius: panelTopRadius,
            height: Math.max(260, containerHeight - safeExpandedY),
          }}
          onDragEnd={handlePanelDragEnd}
          onClick={() => {
            if (openSwipeTxId) setOpenSwipeTxId(null);
          }}
          className="pointer-events-auto relative flex w-full flex-col overflow-hidden bg-white text-[#111827] shadow-[0_-12px_40px_rgba(0,0,0,0.4)]"
        >
          {/* Drag Handle Only (clean collapsed state: handle + list only) */}
          <div
            onPointerDown={(e) => {
              handleDownRef.current = { y: e.clientY, time: Date.now() };
              panelDragControls.start(e);
            }}
            onPointerUp={(e) => {
              if (!handleDownRef.current) return;
              const dy = Math.abs(e.clientY - handleDownRef.current.y);
              const dt = Date.now() - handleDownRef.current.time;
              handleDownRef.current = null;
              // Tapping handle toggles expanded/collapsed
              if (dy < 6 && dt < 260) {
                triggerFeedback(settings.hapticsEnabled, 'tap');
                setOpenSwipeTxId(null);
                setIsExpanded((v) => !v);
              }
            }}
            className="flex cursor-grab touch-none items-center justify-center py-3 select-none active:cursor-grabbing"
          >
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          {/* Scrollable Transaction List */}
          <div
            ref={listScrollRef}
            onScroll={() => {
              if (openSwipeTxId) setOpenSwipeTxId(null);
            }}
            onPointerDown={(e) => {
              listPointerDownRef.current = {
                x: e.clientX,
                y: e.clientY,
                startedDrag: false,
              };
            }}
            onPointerMove={(e) => {
              if (!listPointerDownRef.current || listPointerDownRef.current.startedDrag) return;
              const dx = e.clientX - listPointerDownRef.current.x;
              const dy = e.clientY - listPointerDownRef.current.y;
              if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.4) {
                const scrollTop = listScrollRef.current?.scrollTop ?? 0;
                // Only collapse when expanded & scrolled to top + dragging down; or expand when collapsed + dragging up
                if (isExpanded && dy > 10 && scrollTop <= 1) {
                  listPointerDownRef.current.startedDrag = true;
                  panelDragControls.start(e);
                } else if (!isExpanded && dy < -10 && scrollTop <= 1) {
                  listPointerDownRef.current.startedDrag = true;
                  panelDragControls.start(e);
                }
              }
            }}
            onPointerUp={() => {
              listPointerDownRef.current = null;
            }}
            onPointerCancel={() => {
              listPointerDownRef.current = null;
            }}
            style={{
              paddingBottom: isExpanded
                ? 'calc(6.5rem + env(safe-area-inset-bottom))'
                : `calc(${Math.max(0, collapsedY - safeExpandedY)}px + 6.5rem + env(safe-area-inset-bottom))`,
            }}
            className="no-scrollbar flex-1 touch-pan-y overflow-y-auto pt-1"
          >
            {filteredTransactions.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-10 text-center">
                <p className="text-[15px] font-semibold text-[#111827]">
                  {transactions.length === 0
                    ? isExpanded
                      ? 'No transactions recorded'
                      : 'No transactions yet'
                    : 'No matching transactions'}
                </p>
                <p className="mt-1 max-w-[250px] text-[13px] text-gray-400">
                  {transactions.length === 0
                    ? isExpanded
                      ? 'Your spending, income, and jar transfers will appear here grouped by date.'
                      : 'Tap Spend or Add above to record your first entry.'
                    : 'Try adjusting your search or filter selections.'}
                </p>
              </div>
            ) : isExpanded ? (
              /* Expanded View: Date-Grouped Rounded Cards */
              <div className="space-y-5 pt-1">
                {groupedTransactions.map((group) => (
                  <section key={group.label}>
                    <h3 className="mb-1.5 px-6 text-[12px] font-semibold tracking-wide text-gray-400 uppercase">
                      {group.label}
                    </h3>
                    <div className="space-y-0.5">
                      <AnimatePresence initial={false}>
                        {group.items.map((tx) => (
                          <SwipeableTransactionRow
                            key={tx.id}
                            tx={tx}
                            currency={settings.currency}
                            hapticsEnabled={settings.hapticsEnabled}
                            isRevealed={openSwipeTxId === tx.id}
                            onRevealChange={setOpenSwipeTxId}
                            onDelete={handleDeleteTx}
                            dotColor={getDotColor(tx)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Collapsed View: Clean Rounded Transaction Cards */
              <div className="space-y-0.5 pt-0.5">
                <AnimatePresence initial={false}>
                  {filteredTransactions.map((tx) => (
                    <SwipeableTransactionRow
                      key={tx.id}
                      tx={tx}
                      currency={settings.currency}
                      hapticsEnabled={settings.hapticsEnabled}
                      isRevealed={openSwipeTxId === tx.id}
                      onRevealChange={setOpenSwipeTxId}
                      onDelete={handleDeleteTx}
                      dotColor={getDotColor(tx)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Expanded-Only Filter Overlay Popover (isolated from header height & panel drag) */}
      <AnimatePresence>
        {isExpanded && showFilter && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 z-30 flex flex-col justify-start px-5"
            style={{ paddingTop: 'calc(max(1.35rem, env(safe-area-inset-top)) + 3.25rem)' }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setShowFilter(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 max-h-[65dvh] space-y-3.5 overflow-y-auto rounded-[24px] border border-white/[0.1] bg-[#16191F]/95 p-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold tracking-tight text-white">
                  Filter Transactions
                </span>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[12px] font-medium text-[#6EEFA2] hover:opacity-85"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFilter(false)}
                    className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white hover:bg-white/15"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Type filter */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-[#8E959B]">Type</p>
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
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        typeFilter === tab.id
                          ? 'bg-white text-[#0B0F10]'
                          : 'bg-white/[0.06] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range filter */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-[#8E959B]">Date Range</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All Dates' },
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'This Week' },
                      { id: 'month', label: 'This Month' },
                      { id: 'custom', label: 'Range' },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDateRange(d.id)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        dateRange === d.id
                          ? 'bg-[#6EEFA2] font-semibold text-[#0B0F10]'
                          : 'bg-white/[0.06] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {dateRange === 'custom' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      aria-label="From date"
                      className="rounded-xl border border-white/10 bg-[#121518] px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      aria-label="To date"
                      className="rounded-xl border border-white/10 bg-[#121518] px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Category filter */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-[#8E959B]">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-white/[0.05] text-[#8E959B] hover:text-white'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.name)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        categoryFilter === cat.name
                          ? 'bg-white text-[#0B0F10]'
                          : 'bg-white/[0.05] text-[#C8CFD5] hover:bg-white/10'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dark Glassy Undo Toast (4 seconds) */}
      <AnimatePresence>
        {undoBackup && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{ bottom: 'calc(5.6rem + env(safe-area-inset-bottom))' }}
            className="pointer-events-auto absolute inset-x-6 z-40 mx-auto flex max-w-[340px] items-center justify-between gap-4 rounded-full border border-white/[0.1] bg-[#16191F]/92 px-5 py-3 text-[13px] text-white shadow-[0_14px_38px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <span className="font-medium text-[#E5E7EB]">Transaction deleted</span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="font-semibold text-[#4ADE80] transition-opacity hover:opacity-85 active:scale-95"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
