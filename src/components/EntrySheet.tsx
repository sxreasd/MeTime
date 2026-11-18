import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  animate,
  AnimatePresence,
  motion,
  PanInfo,
  useDragControls,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { AlertTriangle, Check, ChevronDown, ChevronsRight, Delete } from 'lucide-react';
import { useMoney } from '../context/MoneyContext';
import { ConfirmationData } from '../types/money';
import { formatCurrency, triggerFeedback } from '../utils/format';
import {
  GENTLE_DRAG_SPRING,
  SHEET_DURATION,
  SMALL_DURATION,
  SOFT_EASE,
  SOFT_PILL_SPRING,
  SOFT_TAP,
  SOFT_TAP_TRANSITION,
} from '../utils/motion';

interface EntrySheetProps {
  isOpen: boolean;
  isConfirming: boolean;
  initialMode: 'spend' | 'add';
  onClose: () => void;
  onConfirm: (data: ConfirmationData) => void;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

export const EntrySheet = memo(function EntrySheet({
  isOpen,
  isConfirming,
  initialMode,
  onClose,
  onConfirm,
  registerBackHandler,
}: EntrySheetProps) {
  const { spendCategories, addCategories, balance, settings, addTransaction } = useMoney();

  const [mode, setMode] = useState<'spend' | 'add'>(initialMode);
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const sheetDragControls = useDragControls();
  const swipeX = useMotionValue(0);
  const greenOpacity = useTransform(swipeX, [0, 28, 125], [0, 0.72, 1]);
  const checkPreviewOpacity = useTransform(swipeX, [35, 110], [0, 1]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillBtnRef = useRef<HTMLButtonElement>(null);
  const swipeBoxRef = useRef<HTMLDivElement>(null);
  const swipeContentRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const swipeAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const [dropdownTop, setDropdownTop] = useState<number>(138);

  const activeCategories = useMemo(() => {
    const raw = mode === 'spend' ? spendCategories : addCategories;
    const seen = new Set<string>();
    return raw.filter((cat) => {
      const key = cat.name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [mode, spendCategories, addCategories]);

  // Reset state whenever newly opened
  useEffect(() => {
    if (isOpen && !isConfirming) {
      setMode(initialMode);
      setAmountStr('');
      setCustomNote('');
      setDropdownOpen(false);
      swipeX.set(0);
      const list = initialMode === 'spend' ? spendCategories : addCategories;
      if (list.length > 0) setSelectedCategoryId(list[0].id);
    }
  }, [isOpen, isConfirming, initialMode, spendCategories, addCategories, swipeX]);

  // Ensure valid category when switching mode
  useEffect(() => {
    if (activeCategories.length > 0 && !activeCategories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(activeCategories[0].id);
      setCustomNote('');
    }
  }, [mode, activeCategories, selectedCategoryId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [dropdownOpen]);

  // Register back interceptor for dropdown before closing the whole sheet
  useEffect(() => {
    if (!registerBackHandler) return;
    if (!isOpen || isConfirming) {
      registerBackHandler(null);
      return;
    }
    registerBackHandler(() => {
      if (dropdownOpen) {
        setDropdownOpen(false);
        return true;
      }
      return false;
    });
    return () => registerBackHandler(null);
  }, [isOpen, isConfirming, dropdownOpen, registerBackHandler]);

  const selectedCategory = useMemo(
    () => activeCategories.find((c) => c.id === selectedCategoryId) || activeCategories[0],
    [activeCategories, selectedCategoryId]
  );

  const isOthersSelected =
    selectedCategory?.isOthers || selectedCategory?.name.toLowerCase() === 'others';

  const numericAmount = useMemo(() => {
    if (!amountStr) return 0;
    const parsed = parseFloat(amountStr);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountStr]);

  const formattedDisplay = useMemo(() => {
    if (!amountStr || amountStr === '0') return '0.00';
    const [intPart, decPart] = amountStr.split('.');
    const intNum = parseInt(intPart || '0', 10);
    const formattedInt = Number.isFinite(intNum) ? intNum.toLocaleString('en-US') : '0';
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  }, [amountStr]);

  const isEmpty = numericAmount <= 0 && !amountStr;
  const exceedsBalance = mode === 'spend' && numericAmount > balance;
  const projectedBalance = balance - numericAmount;

  // Keep category dropdown anchored cleanly below pill without getting clipped by overflow-hidden
  useEffect(() => {
    if (!dropdownOpen || !pillBtnRef.current || !dropdownRef.current) return;
    const pillRect = pillBtnRef.current.getBoundingClientRect();
    const wrapRect = dropdownRef.current.getBoundingClientRect();
    setDropdownTop(Math.round(pillRect.bottom - wrapRect.top + 10));
  }, [dropdownOpen, exceedsBalance, numericAmount]);

  const handleKeyPress = (key: string) => {
    triggerFeedback(settings.hapticsEnabled, 'tap');

    if (key === 'backspace') {
      setAmountStr((prev) => prev.slice(0, -1));
      return;
    }

    if (key === '.') {
      setAmountStr((prev) => {
        if (prev.includes('.')) return prev;
        if (!prev) return '0.';
        return `${prev}.`;
      });
      return;
    }

    setAmountStr((prev) => {
      if (prev.includes('.')) {
        const [, dec] = prev.split('.');
        if (dec && dec.length >= 2) return prev;
        return `${prev}${key}`;
      }
      if (prev === '0') {
        return key === '0' ? '0' : key;
      }
      if (prev.length >= 9) return prev;
      return `${prev}${key}`;
    });
  };

  // Keyboard input support on desktop
  useEffect(() => {
    if (!isOpen || isConfirming) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape') setDropdownOpen(false);
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === '.') {
        handleKeyPress('.');
      } else if (e.key === 'Backspace') {
        handleKeyPress('backspace');
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && numericAmount > 0) {
        completeTransaction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const completeTransaction = () => {
    if (numericAmount <= 0 || !selectedCategory) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setShakeTrigger((c) => c + 1);
      return;
    }

    const note = isOthersSelected ? customNote.trim() : '';
    const tx = addTransaction({
      type: mode,
      category: selectedCategory.name,
      note: note || undefined,
      amount: numericAmount,
    });

    triggerFeedback(settings.hapticsEnabled, 'confirm');

    let subtitle = '';
    if (mode === 'spend') {
      subtitle = `Spent on ${note || selectedCategory.name}`;
    } else {
      if (note) {
        subtitle = `Added from ${note}`;
      } else if (selectedCategory.name.toLowerCase() === 'others') {
        subtitle = 'Added from Others';
      } else {
        subtitle = `Added to ${selectedCategory.name}`;
      }
    }

    const rect = swipeBoxRef.current?.getBoundingClientRect();
    onConfirm({
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      note: tx.note,
      subtitle,
      originRect: rect
        ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        : undefined,
    });
  };

  const resetSwipeSoftly = () => {
    swipeAnimRef.current?.stop();
    if (swipeContentRef.current) swipeContentRef.current.style.willChange = 'transform';
    swipeAnimRef.current = animate(swipeX, 0, {
      ...GENTLE_DRAG_SPRING,
      onComplete: () => {
        if (swipeContentRef.current) swipeContentRef.current.style.willChange = 'auto';
      },
    });
  };

  const handleSwipeStart = () => {
    if (dropdownOpen || isConfirming) return;
    swipeAnimRef.current?.stop();
    if (swipeContentRef.current) swipeContentRef.current.style.willChange = 'transform';
  };

  const handleSwipePan = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (dropdownOpen || isConfirming) return;
    const raw = info.offset.x;
    let next = raw;
    if (raw <= 0) {
      next = 0;
    } else if (raw > 200) {
      next = 200 + (raw - 200) * 0.2;
    }
    swipeX.set(next);
  };

  const handleSwipeEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (dropdownOpen || isConfirming) return;
    const current = swipeX.get();

    if (numericAmount <= 0) {
      resetSwipeSoftly();
      triggerFeedback(settings.hapticsEnabled, 'error');
      setShakeTrigger((c) => c + 1);
      return;
    }

    const passedThreshold = current >= 100 || (info.velocity.x > 300 && current > 40);
    if (passedThreshold) {
      if (swipeContentRef.current) swipeContentRef.current.style.willChange = 'auto';
      completeTransaction();
    } else {
      resetSwipeSoftly();
    }
  };

  const handleSheetDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (sheetRef.current) sheetRef.current.style.willChange = 'auto';
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
            onClick={() => {
              if (!isConfirming) onClose();
            }}
            className="absolute inset-0 bg-black/65"
          />

          {/* Phone-contained bottom sheet on >500px, edge-to-edge on phones */}
          <div className="pointer-events-none relative z-10 flex h-full w-full items-end overflow-hidden min-[501px]:max-w-[420px] min-[501px]:rounded-[38px]">
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={
                isConfirming
                  ? { opacity: 0, transition: { duration: 0.22, ease: SOFT_EASE } }
                  : { y: '100%', transition: { duration: SHEET_DURATION, ease: SOFT_EASE } }
              }
              transition={{ duration: SHEET_DURATION, ease: SOFT_EASE }}
              drag={isConfirming ? false : 'y'}
              dragControls={sheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 520 }}
              dragElastic={{ top: 0, bottom: 0.32 }}
              dragSnapToOrigin
              dragTransition={{ bounceStiffness: 135, bounceDamping: 24 }}
              onDragStart={() => {
                if (sheetRef.current) sheetRef.current.style.willChange = 'transform';
              }}
              onDragEnd={handleSheetDragEnd}
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
              className="pointer-events-auto relative flex max-h-[92%] w-full flex-col rounded-t-[32px] bg-white px-5 pt-3 text-[#111827] shadow-2xl"
            >
              {/* Drag Handle + Mode Toggle Header (vertical drag zone) */}
              <div
                onPointerDown={(e) => sheetDragControls.start(e)}
                className="cursor-grab touch-none pb-2 active:cursor-grabbing"
              >
                <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#E5E7EB]" />

                {/* Segmented Pill Toggle */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center rounded-full bg-transparent p-1">
                    {(['spend', 'add'] as const).map((tab) => {
                      const active = mode === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            triggerFeedback(settings.hapticsEnabled, 'tap');
                            setMode(tab);
                            setDropdownOpen(false);
                          }}
                          className={`relative min-h-[38px] rounded-full px-6 py-1.5 text-[14px] ${
                            active
                              ? 'font-semibold text-[#111827]'
                              : 'font-medium text-[#9CA3AF] hover:text-[#4B5563]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="entry-mode-pill"
                              transition={SOFT_PILL_SPRING}
                              className="absolute inset-0 rounded-full bg-[#F1F3F5]"
                            />
                          )}
                          <span className="relative z-10 capitalize">{tab}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Over-balance Warning Banner (transform + opacity only) */}
              <AnimatePresence initial={false}>
                {exceedsBalance && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
                    className="px-1"
                  >
                    <div className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-red-50/90 px-3.5 py-2 text-[12px] font-medium text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>
                        Exceeds balance — new balance will be{' '}
                        <strong className="tabular-nums">
                          {formatCurrency(projectedBalance, settings.currency)}
                        </strong>
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Middle Swipe-to-Confirm Area (outer wrapper keeps category popover unclipped) */}
              <div
                ref={dropdownRef}
                className="relative my-2 flex flex-1 flex-col items-center justify-center"
              >
                {/* Fixed-Size Rounded Clipped Box */}
                <div
                  ref={swipeBoxRef}
                  className="relative flex min-h-[188px] w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] py-6"
                >
                  {/* Fixed-Size Green Box (opacity 0 before swipe, rises smoothly while swiping) */}
                  {!isConfirming && (
                    <motion.div
                      aria-hidden="true"
                      style={{
                        opacity: numericAmount > 0 ? greenOpacity : 0,
                        boxShadow: '0 8px 24px rgba(30, 216, 43, 0.24)',
                      }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-start rounded-[28px] bg-[#1ED82B] pl-7"
                    >
                      <motion.div
                        style={{ opacity: checkPreviewOpacity }}
                        className="flex items-center gap-2.5 text-white"
                      >
                        <Check className="h-7 w-7 stroke-[3]" />
                        <span className="text-[15px] font-semibold">Release to confirm</span>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* 1:1 Pan-Tracked Middle Content (clipped cleanly inside the fixed rounded box) */}
                  <motion.div
                    ref={swipeContentRef}
                    key={shakeTrigger}
                    animate={
                      shakeTrigger > 0 ? { x: [0, -8, 8, -5, 5, -2, 2, 0] } : { x: 0 }
                    }
                    transition={{ duration: 0.36, ease: SOFT_EASE }}
                    onPanStart={handleSwipeStart}
                    onPan={handleSwipePan}
                    onPanEnd={handleSwipeEnd}
                    style={{ x: swipeX }}
                    className="relative z-10 flex w-full cursor-grab touch-pan-y flex-col items-center justify-center select-none active:cursor-grabbing"
                  >
                    {/* Large Amount Readout */}
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0.65, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
                      className={`flex items-baseline justify-center gap-2.5 text-[44px] leading-none font-bold tracking-tight tabular-nums transition-colors duration-250 ${
                        isEmpty ? 'text-[#CBD5E1]' : 'text-[#111827]'
                      }`}
                    >
                      <span>{settings.currency}</span>
                      <span>{formattedDisplay}</span>
                    </motion.div>

                    {/* Category Pill */}
                    <div className="relative mt-4">
                      <motion.button
                        ref={pillBtnRef}
                        type="button"
                        whileTap={SOFT_TAP}
                        transition={SOFT_TAP_TRANSITION}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          triggerFeedback(settings.hapticsEnabled, 'tap');
                          setDropdownOpen((o) => !o);
                        }}
                        className="flex min-h-[38px] items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-1.5 text-[14px] font-medium text-[#1F2937] shadow-xs hover:bg-[#F1F5F9]"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: selectedCategory?.color || '#F59E0B' }}
                        />
                        <span className="max-w-[180px] truncate">
                          {isOthersSelected && customNote.trim()
                            ? customNote.trim()
                            : selectedCategory?.name}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-[#6B7280] transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            dropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </motion.button>
                    </div>

                    {/* Subtle Swipe-Right Hint once amount > 0 (paused when sheet closed/confirming) */}
                    <AnimatePresence>
                      {isOpen && !isConfirming && numericAmount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 2 }}
                          transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
                          className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF]"
                        >
                          <span>Swipe right to confirm</span>
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                            className="inline-flex text-[#16A34A]"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </motion.span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Category Dropdown Popover (anchored to pill, outside overflow-hidden) */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{ top: dropdownTop }}
                      className="absolute left-1/2 z-30 w-[264px] -translate-x-1/2 rounded-[24px] border border-gray-100 bg-white p-2 shadow-xl"
                    >
                      <div className="space-y-0.5">
                        {activeCategories.map((cat) => {
                          const isSelected = cat.id === selectedCategory?.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                triggerFeedback(settings.hapticsEnabled, 'tap');
                                setSelectedCategoryId(cat.id);
                                if (!cat.isOthers && cat.name.toLowerCase() !== 'others') {
                                  setDropdownOpen(false);
                                }
                              }}
                              className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-left text-[14px] ${
                                isSelected
                                  ? 'bg-[#F3F4F6] font-semibold text-[#111827]'
                                  : 'font-normal text-[#374151] hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span>{cat.name}</span>
                              </span>
                              {isSelected && <Check className="h-4 w-4 text-[#111827]" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Specify input for Others */}
                      {isOthersSelected && (
                        <div className="mt-1.5 px-1 pb-1">
                          <input
                            type="text"
                            autoFocus
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setDropdownOpen(false);
                            }}
                            placeholder={
                              mode === 'spend'
                                ? 'Specify (e.g. Date)...'
                                : 'Specify (e.g. Paid Debt)...'
                            }
                            className="w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:outline-none"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Custom Number Pad */}
              <div className="rounded-[28px] bg-[#F8F9FA] p-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        aria-label={key === 'backspace' ? 'Backspace' : key}
                        onClick={() => handleKeyPress(key)}
                        className="soft-press flex h-[56px] items-center justify-center rounded-[18px] bg-white text-[22px] font-normal text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors duration-200 hover:bg-gray-50 active:bg-gray-100"
                      >
                        {key === 'backspace' ? (
                          <Delete className="h-5 w-5 text-[#1F2937]" />
                        ) : (
                          key
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
});
