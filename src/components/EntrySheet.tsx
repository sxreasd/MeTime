import { useEffect, useMemo, useRef, useState } from 'react';
import {
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

interface EntrySheetProps {
  isOpen: boolean;
  isConfirming: boolean;
  initialMode: 'spend' | 'add';
  onClose: () => void;
  onConfirm: (data: ConfirmationData) => void;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

export function EntrySheet({
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
  const greenOpacity = useTransform(swipeX, [0, 35, 130], [0, 0.88, 1]);
  const greenScale = useTransform(swipeX, [0, 140], [0.92, 1]);
  const greenX = useTransform(swipeX, [0, 140], [-20, 0]);
  const checkPreviewOpacity = useTransform(swipeX, [35, 110], [0, 1]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCategories = mode === 'spend' ? spendCategories : addCategories;

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

    onConfirm({
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      note: tx.note,
      subtitle,
    });
  };

  const handleSwipeEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (numericAmount <= 0) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setShakeTrigger((c) => c + 1);
      return;
    }

    const passedThreshold = info.offset.x > 100 || (info.velocity.x > 340 && info.offset.x > 40);
    if (passedThreshold) {
      completeTransaction();
    }
  };

  const handleSheetDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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
            transition={{ duration: 0.16 }}
            onClick={() => {
              if (!isConfirming) onClose();
            }}
            className="absolute inset-0 bg-black/65"
          />

          {/* Phone-contained bottom sheet on >500px, edge-to-edge on phones */}
          <div className="pointer-events-none relative z-10 flex h-full w-full items-end overflow-hidden min-[501px]:max-w-[420px] min-[501px]:rounded-[38px]">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={
                isConfirming
                  ? { opacity: 0, transition: { duration: 0.08 } }
                  : { y: '100%', transition: { type: 'spring', stiffness: 400, damping: 36 } }
              }
              transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.85 }}
              drag={isConfirming ? false : 'y'}
              dragControls={sheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 520 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              dragSnapToOrigin
              onDragEnd={handleSheetDragEnd}
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
              className="pointer-events-auto relative flex max-h-[92%] w-full flex-col rounded-t-[32px] bg-white px-5 pt-3 text-[#111827] shadow-2xl will-change-transform"
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
                              transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
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
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
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

              {/* Middle Swipe-to-Confirm Area */}
              <div className="relative my-2 flex flex-1 flex-col items-center justify-center py-6">
                {/* Floating Green Card (morphs smoothly to Fullscreen ConfirmScreen via layoutId) */}
                {!isConfirming && (
                  <motion.div
                    layoutId="confirm-green-morph"
                    aria-hidden="true"
                    style={{
                      borderRadius: 28,
                      opacity: numericAmount > 0 ? greenOpacity : 0,
                      scale: numericAmount > 0 ? greenScale : 0.92,
                      x: numericAmount > 0 ? greenX : 0,
                      boxShadow: '0 8px 24px rgba(30, 216, 43, 0.24)',
                    }}
                    className="pointer-events-none absolute inset-y-2 inset-x-0 flex items-center justify-start bg-[#1ED82B] pl-7 will-change-transform"
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

                {/* Draggable Middle Content */}
                <motion.div
                  key={shakeTrigger}
                  animate={
                    shakeTrigger > 0 ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : { x: 0 }
                  }
                  transition={{ duration: 0.32 }}
                  drag={dropdownOpen || isConfirming ? false : 'x'}
                  dragConstraints={{ left: 0, right: 240 }}
                  dragElastic={{ left: 0.06, right: 0.35 }}
                  dragSnapToOrigin
                  style={{ x: swipeX }}
                  onDragEnd={handleSwipeEnd}
                  className="relative z-10 flex w-full cursor-grab flex-col items-center justify-center select-none active:cursor-grabbing"
                >
                  {/* Large Amount Readout */}
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0.65, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.14 }}
                    className={`flex items-baseline justify-center gap-2.5 text-[44px] leading-none font-bold tracking-tight tabular-nums transition-colors duration-150 ${
                      isEmpty ? 'text-[#CBD5E1]' : 'text-[#111827]'
                    }`}
                  >
                    <span>{settings.currency}</span>
                    <span>{formattedDisplay}</span>
                  </motion.div>

                  {/* Category Pill + Popover */}
                  <div ref={dropdownRef} className="relative mt-4">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 700, damping: 32 }}
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
                        className={`h-4 w-4 text-[#6B7280] transition-transform duration-150 ${
                          dropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </motion.button>

                    {/* Dropdown Popover */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="absolute left-1/2 top-full z-30 mt-2.5 w-[264px] -translate-x-1/2 rounded-[24px] border border-gray-100 bg-white p-2 shadow-xl"
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

                  {/* Subtle Swipe-Right Hint once amount > 0 */}
                  <AnimatePresence>
                    {numericAmount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 2 }}
                        transition={{ duration: 0.15 }}
                        className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF]"
                      >
                        <span>Swipe right to confirm</span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                          className="inline-flex text-[#16A34A]"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Custom Number Pad */}
              <div className="rounded-[28px] bg-[#F8F9FA] p-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(
                    (key) => (
                      <motion.button
                        key={key}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 750, damping: 30 }}
                        aria-label={key === 'backspace' ? 'Backspace' : key}
                        onClick={() => handleKeyPress(key)}
                        className="flex h-[56px] items-center justify-center rounded-[18px] bg-white text-[22px] font-normal text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-gray-50 active:bg-gray-100"
                      >
                        {key === 'backspace' ? (
                          <Delete className="h-5 w-5 text-[#1F2937]" />
                        ) : (
                          key
                        )}
                      </motion.button>
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
}
