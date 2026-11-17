import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, PanInfo, useDragControls } from 'motion/react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Delete,
  MoreHorizontal,
  PiggyBank as PiggyIcon,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useMoney } from '../context/MoneyContext';
import { JAR_COLOR_STYLES, Jar, JarColorKey } from '../types/money';
import { formatCurrency, triggerFeedback } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

interface PiggyBankProps {
  onBack: () => void;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

const COLOR_KEYS: JarColorKey[] = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'];

interface JarCardProps {
  jar: Jar;
  currency: string;
  onOpenTransfer: (jar: Jar) => void;
  onOpenEdit: (jar: Jar) => void;
}

const JarCard = memo(function JarCard({
  jar,
  currency,
  onOpenTransfer,
  onOpenEdit,
}: JarCardProps) {
  const style = JAR_COLOR_STYLES[jar.color] || JAR_COLOR_STYLES.yellow;
  const progress =
    jar.goal && jar.goal > 0
      ? Math.min(100, Math.round((jar.balance / jar.goal) * 100))
      : null;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{
        backgroundColor: style.bg,
        boxShadow: style.glow,
      }}
      className="relative flex min-h-[146px] flex-col justify-between overflow-hidden rounded-[24px] p-5"
    >
      {/* Signature Overlapping Translucent Circles */}
      <div
        aria-hidden="true"
        style={{ backgroundColor: style.circleA }}
        className="pointer-events-none absolute -right-12 -bottom-16 h-52 w-52 rounded-full"
      />
      <div
        aria-hidden="true"
        style={{ backgroundColor: style.circleB }}
        className="pointer-events-none absolute -right-16 top-6 h-44 w-44 rounded-full"
      />

      {/* Top Row: Name + Balance */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            style={{ color: style.text }}
            className="truncate text-[18px] font-medium tracking-tight"
          >
            {jar.name}
          </h3>
          {jar.goal && jar.goal > 0 && (
            <p style={{ color: style.subtext }} className="mt-1 text-[12px] font-medium tabular-nums">
              Goal {formatCurrency(jar.goal, currency)} ({progress}%)
            </p>
          )}
        </div>

        <span style={{ color: style.text }} className="shrink-0">
          <AnimatedNumber
            value={jar.balance}
            currency={currency}
            className="text-[22px] font-bold tracking-tight"
          />
        </span>
      </div>

      {/* Optional Goal Bar (pure scaleX transform) */}
      {progress !== null && (
        <div className="relative z-10 mt-2 mb-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(0, Math.min(1, progress / 100)) }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="h-full w-full origin-left rounded-full bg-white/80"
          />
        </div>
      )}

      {/* Bottom Left Buttons: + and Gear */}
      <div className="relative z-10 mt-4 flex items-center gap-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          aria-label={`Move money in ${jar.name}`}
          onClick={() => onOpenTransfer(jar)}
          style={{ backgroundColor: style.btnBg, color: style.btnText }}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5 stroke-[2.2]" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          aria-label={`Settings for ${jar.name}`}
          onClick={() => onOpenEdit(jar)}
          style={{ backgroundColor: style.btnBg, color: style.btnText }}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-90"
        >
          <Settings className="h-[18px] w-[18px]" />
        </motion.button>
      </div>
    </motion.div>
  );
});

export function PiggyBank({ onBack, registerBackHandler }: PiggyBankProps) {
  const { jars, balance, totalPiggyBank, settings, createJar, updateJar, deleteJar, transferJarMoney } =
    useMoney();

  const [sortBy, setSortBy] = useState<'created' | 'balance' | 'name'>('created');
  const [menuOpen, setMenuOpen] = useState(false);

  // Create / Edit modal state
  const [jarModalMode, setJarModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingJar, setEditingJar] = useState<Jar | null>(null);
  const [jarName, setJarName] = useState('');
  const [jarColor, setJarColor] = useState<JarColorKey>('yellow');
  const [jarGoal, setJarGoal] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Deposit / Withdraw sheet state
  const [transferJar, setTransferJar] = useState<Jar | null>(null);
  const [transferDir, setTransferDir] = useState<'deposit' | 'withdraw'>('deposit');
  const [transferAmountStr, setTransferAmountStr] = useState('');

  // Sheet drag-to-close controls & scroll-top guards
  const jarModalDragControls = useDragControls();
  const transferSheetDragControls = useDragControls();
  const jarModalRef = useRef<HTMLFormElement>(null);
  const jarModalScrollRef = useRef<HTMLDivElement>(null);
  const jarScrollStartYRef = useRef<number | null>(null);
  const transferSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (transferJar) {
        setTransferJar(null);
        return true;
      }
      if (jarModalMode) {
        setJarModalMode(null);
        return true;
      }
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      return false;
    });
    return () => registerBackHandler(null);
  }, [transferJar, jarModalMode, menuOpen, registerBackHandler]);

  const sortedJars = useMemo(() => {
    const copy = [...jars];
    if (sortBy === 'balance') copy.sort((a, b) => b.balance - a.balance);
    else if (sortBy === 'name') copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [jars, sortBy]);

  const openCreateModal = () => {
    triggerFeedback(settings.hapticsEnabled, 'tap');
    setEditingJar(null);
    setJarName('');
    setJarColor('yellow');
    setJarGoal('');
    setConfirmDelete(false);
    setJarModalMode('create');
  };

  const openEditModal = useCallback(
    (jar: Jar) => {
      triggerFeedback(settings.hapticsEnabled, 'tap');
      setEditingJar(jar);
      setJarName(jar.name);
      setJarColor(jar.color);
      setJarGoal(jar.goal ? String(jar.goal) : '');
      setConfirmDelete(false);
      setJarModalMode('edit');
    },
    [settings.hapticsEnabled]
  );

  const handleSaveJar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jarName.trim()) return;
    const goalNum = parseFloat(jarGoal);
    const cleanGoal = Number.isFinite(goalNum) && goalNum > 0 ? goalNum : undefined;

    if (jarModalMode === 'create') {
      createJar({ name: jarName, color: jarColor, goal: cleanGoal });
    } else if (jarModalMode === 'edit' && editingJar) {
      updateJar(editingJar.id, { name: jarName, color: jarColor, goal: cleanGoal ?? 0 });
    }
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    setJarModalMode(null);
  };

  const handleConfirmDelete = () => {
    if (!editingJar) return;
    deleteJar(editingJar.id);
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    setJarModalMode(null);
  };

  const openTransferSheet = useCallback(
    (jar: Jar) => {
      triggerFeedback(settings.hapticsEnabled, 'tap');
      setTransferJar(jar);
      setTransferDir('deposit');
      setTransferAmountStr('');
    },
    [settings.hapticsEnabled]
  );

  const transferAmount = useMemo(() => {
    const p = parseFloat(transferAmountStr);
    return Number.isFinite(p) ? p : 0;
  }, [transferAmountStr]);

  const handleTransferKey = (key: string) => {
    triggerFeedback(settings.hapticsEnabled, 'tap');
    if (key === 'backspace') {
      setTransferAmountStr((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      setTransferAmountStr((prev) => {
        if (prev.includes('.')) return prev;
        return prev ? `${prev}.` : '0.';
      });
      return;
    }
    setTransferAmountStr((prev) => {
      if (prev.includes('.')) {
        const [, dec] = prev.split('.');
        if (dec && dec.length >= 2) return prev;
        return `${prev}${key}`;
      }
      if (prev === '0') return key === '0' ? '0' : key;
      if (prev.length >= 8) return prev;
      return `${prev}${key}`;
    });
  };

  const handleConfirmTransfer = () => {
    if (!transferJar || transferAmount <= 0) return;
    if (transferDir === 'withdraw' && transferAmount > transferJar.balance) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      return;
    }
    transferJarMoney(transferJar.id, transferDir, transferAmount);
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    setTransferJar(null);
  };

  const transferExceedsBalance = transferDir === 'deposit' && transferAmount > balance;
  const transferExceedsJar =
    transferDir === 'withdraw' && transferJar !== null && transferAmount > transferJar.balance;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent text-white">
      {/* Top Header */}
      <header
        style={{ paddingTop: 'max(1.35rem, env(safe-area-inset-top))' }}
        className="relative z-20 flex items-center justify-between px-6 pb-3"
      >
        <button
          type="button"
          aria-label="Back to Home"
          onClick={() => {
            triggerFeedback(settings.hapticsEnabled, 'tap');
            onBack();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-[#1C2124]/92 text-white transition-transform hover:bg-[#242A2E] active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-[17px] font-semibold tracking-tight text-white">Piggy Bank</span>

        <div className="relative">
          <button
            type="button"
            aria-label="Jar options"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              setMenuOpen((o) => !o);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-[#1C2124]/92 text-white transition-transform hover:bg-[#242A2E] active:scale-95"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                className="absolute right-0 top-13 z-30 w-48 rounded-2xl border border-white/10 bg-[#1A1D21] p-1.5 shadow-lg"
              >
                <p className="px-3 py-1.5 text-[11px] font-medium text-[#8E959B]">
                  Total Saved: {formatCurrency(totalPiggyBank, settings.currency)}
                </p>
                <div className="my-1 h-px bg-white/[0.06]" />
                {(
                  [
                    { id: 'created', label: 'Sort: Default' },
                    { id: 'balance', label: 'Sort: Highest Balance' },
                    { id: 'name', label: 'Sort: Name' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.id);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                      sortBy === opt.id
                        ? 'bg-white/10 font-semibold text-white'
                        : 'text-[#C8CFD5] hover:bg-white/5'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Title + New Jar Button */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-3 pb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-white">Piggy Bank</h1>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={openCreateModal}
          className="min-h-[40px] rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0B0F10] shadow-sm transition-colors hover:bg-neutral-100"
        >
          + New jar
        </motion.button>
      </div>

      {/* Jars List */}
      <div className="no-scrollbar relative z-10 flex-1 touch-pan-y overflow-y-auto px-6 pb-10">
        {sortedJars.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-col items-center rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/92 px-6 py-12 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-[#8E959B]">
              <PiggyIcon className="h-7 w-7" />
            </div>
            <h2 className="text-[16px] font-semibold text-white">No savings jars yet</h2>
            <p className="mt-1.5 max-w-[240px] text-[13px] text-[#8E959B]">
              Create a jar to set aside money for emergencies, tech, travel, or goals.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={openCreateModal}
              className="mt-5 min-h-[44px] rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0B0F10]"
            >
              + Create your first jar
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-4 pb-6">
            <AnimatePresence initial={false}>
              {sortedJars.map((jar) => (
                <JarCard
                  key={jar.id}
                  jar={jar}
                  currency={settings.currency}
                  onOpenTransfer={openTransferSheet}
                  onOpenEdit={openEditModal}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create / Edit Jar Sheet */}
      <AnimatePresence>
        {jarModalMode && (
          <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setJarModalMode(null)}
              className="absolute inset-0 bg-black/70"
            />
            <div className="pointer-events-none relative z-10 flex h-full w-full items-end overflow-hidden min-[501px]:max-w-[420px] min-[501px]:rounded-[38px]">
              <motion.form
                ref={jarModalRef}
                onSubmit={handleSaveJar}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                drag="y"
                dragControls={jarModalDragControls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0.06, bottom: 1 }}
                dragSnapToOrigin
                onDragEnd={(_e, info: PanInfo) => {
                  const sheetHeight = jarModalRef.current?.offsetHeight || 440;
                  if (info.offset.y > sheetHeight * 0.3 || info.velocity.y > 420) {
                    setJarModalMode(null);
                  }
                }}
                style={{ paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom))' }}
                className="pointer-events-auto flex max-h-[88dvh] w-full flex-col rounded-t-[32px] border-t border-white/10 bg-[#14181B] px-6 pt-3 text-white shadow-2xl will-change-transform"
              >
                <div
                  onPointerDown={(e) => jarModalDragControls.start(e)}
                  className="-mx-6 cursor-grab touch-none px-6 pt-1 pb-3 active:cursor-grabbing"
                >
                  <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/25" />
                  <h2 className="text-[18px] font-bold">
                    {jarModalMode === 'create' ? 'New Savings Jar' : 'Edit Jar'}
                  </h2>
                </div>

                <div
                  ref={jarModalScrollRef}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input, button, select, textarea')) {
                      jarScrollStartYRef.current = null;
                      return;
                    }
                    jarScrollStartYRef.current = e.clientY;
                  }}
                  onPointerMove={(e) => {
                    if (jarScrollStartYRef.current === null) return;
                    const deltaY = e.clientY - jarScrollStartYRef.current;
                    const scrollTop = jarModalScrollRef.current?.scrollTop ?? 0;
                    if (scrollTop <= 0 && deltaY > 6) {
                      jarScrollStartYRef.current = null;
                      jarModalDragControls.start(e);
                    } else if (deltaY < -6) {
                      jarScrollStartYRef.current = null;
                    }
                  }}
                  onPointerUp={() => {
                    jarScrollStartYRef.current = null;
                  }}
                  onPointerCancel={() => {
                    jarScrollStartYRef.current = null;
                  }}
                  className="no-scrollbar mt-2 flex-1 overflow-y-auto"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
                        Jar Name
                      </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={jarName}
                      onChange={(e) => setJarName(e.target.value)}
                      placeholder="e.g. Emergency Fund"
                      className="w-full rounded-2xl border border-white/10 bg-[#1C2126] px-4 py-3 text-[15px] text-white placeholder:text-[#6B7280] focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#8E959B]">
                      Jar Color
                    </label>
                    <div className="flex items-center gap-3">
                      {COLOR_KEYS.map((key) => {
                        const selected = jarColor === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-label={JAR_COLOR_STYLES[key].label}
                            onClick={() => {
                              triggerFeedback(settings.hapticsEnabled, 'tap');
                              setJarColor(key);
                            }}
                            style={{ backgroundColor: JAR_COLOR_STYLES[key].bg }}
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90 ${
                              selected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#14181B]' : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            {selected && (
                              <Check
                                className="h-4 w-4 stroke-[3]"
                                style={{ color: JAR_COLOR_STYLES[key].text }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
                      Goal Amount (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={jarGoal}
                      onChange={(e) => setJarGoal(e.target.value)}
                      placeholder={`e.g. 5000`}
                      className="w-full rounded-2xl border border-white/10 bg-[#1C2126] px-4 py-3 text-[15px] text-white placeholder:text-[#6B7280] focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    className="min-h-[48px] w-full rounded-full bg-white py-3 text-[15px] font-semibold text-[#0B0F10] transition-colors hover:bg-neutral-100"
                  >
                    {jarModalMode === 'create' ? 'Create Jar' : 'Save Changes'}
                  </motion.button>

                  {jarModalMode === 'edit' && editingJar && (
                    <div className="pt-1">
                      {!confirmDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 py-2.5 text-[14px] font-medium text-red-400 transition-colors hover:bg-red-500/15"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Jar</span>
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center">
                          <p className="text-[12px] text-red-200">
                            {editingJar.balance > 0
                              ? `Return ${formatCurrency(editingJar.balance, settings.currency)} to main balance and delete "${editingJar.name}"?`
                              : `Delete "${editingJar.name}" permanently?`}
                          </p>
                          <div className="mt-2.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              className="flex-1 rounded-full bg-white/10 py-2 text-[13px] font-medium text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmDelete}
                              className="flex-1 rounded-full bg-red-500 py-2 text-[13px] font-semibold text-white"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </motion.form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Deposit / Withdraw Transfer Sheet */}
      <AnimatePresence>
        {transferJar && (
          <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferJar(null)}
              className="absolute inset-0 bg-black/70"
            />
            <div className="pointer-events-none relative z-10 flex h-full w-full items-end overflow-hidden min-[501px]:max-w-[420px] min-[501px]:rounded-[38px]">
              <motion.div
                ref={transferSheetRef}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                drag="y"
                dragControls={transferSheetDragControls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0.06, bottom: 1 }}
                dragSnapToOrigin
                onDragEnd={(_e, info: PanInfo) => {
                  const sheetHeight = transferSheetRef.current?.offsetHeight || 480;
                  if (info.offset.y > sheetHeight * 0.3 || info.velocity.y > 420) {
                    setTransferJar(null);
                  }
                }}
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
                className="pointer-events-auto w-full rounded-t-[32px] bg-white px-5 pt-3 text-[#111827] shadow-2xl will-change-transform"
              >
                <div
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    transferSheetDragControls.start(e);
                  }}
                  className="-mx-5 cursor-grab touch-none px-5 pt-1 pb-1 active:cursor-grabbing"
                >
                  <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />

                  {/* Deposit / Withdraw Segmented Pill */}
                  <div className="flex items-center justify-center px-1">
                    <div className="inline-flex rounded-full bg-[#F1F3F5] p-1">
                      {(['deposit', 'withdraw'] as const).map((dir) => {
                        const active = transferDir === dir;
                        return (
                          <button
                            key={dir}
                            type="button"
                            onClick={() => {
                              triggerFeedback(settings.hapticsEnabled, 'tap');
                              setTransferDir(dir);
                            }}
                            className={`relative rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                              active ? 'font-semibold text-[#111827]' : 'font-medium text-gray-500'
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="jar-transfer-pill"
                                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                                className="absolute inset-0 rounded-full bg-white shadow-xs"
                              />
                            )}
                            <span className="relative z-10">
                              {dir === 'deposit' ? 'Move to Jar' : 'Withdraw'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Jar Context & Amount Display */}
                <div
                  onPointerDown={(e) => transferSheetDragControls.start(e)}
                  className="cursor-grab touch-none py-4 text-center active:cursor-grabbing"
                >
                  <p className="text-[12px] font-medium text-gray-500">
                    {transferJar.name} ·{' '}
                    {transferDir === 'deposit'
                      ? `Balance: ${formatCurrency(balance, settings.currency)}`
                      : `In Jar: ${formatCurrency(transferJar.balance, settings.currency)}`}
                  </p>
                  <p
                    className={`mt-2 text-[38px] font-bold tracking-tight tabular-nums ${
                      transferAmount <= 0 ? 'text-[#CBD5E1]' : 'text-[#111827]'
                    }`}
                  >
                    {settings.currency}{' '}
                    {transferAmountStr
                      ? transferAmountStr
                      : '0.00'}
                  </p>

                  {transferExceedsBalance && (
                    <div className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Main balance will go negative</span>
                    </div>
                  )}

                  {transferExceedsJar && (
                    <div className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      <span>
                        Max available in jar is{' '}
                        {formatCurrency(transferJar.balance, settings.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Numpad */}
                <div className="rounded-[24px] bg-[#F8F9FA] p-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(
                      (k) => (
                        <motion.button
                          key={k}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleTransferKey(k)}
                          className="flex h-12 items-center justify-center rounded-[14px] bg-white text-[20px] font-normal text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                        >
                          {k === 'backspace' ? <Delete className="h-5 w-5" /> : k}
                        </motion.button>
                      )
                    )}
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={transferAmount <= 0 || transferExceedsJar}
                  onClick={handleConfirmTransfer}
                  className="mt-3 min-h-[48px] w-full rounded-full bg-[#1ED82B] py-3 text-[15px] font-semibold text-white shadow-sm transition-opacity disabled:opacity-40"
                >
                  {transferDir === 'deposit'
                    ? `Add to ${transferJar.name}`
                    : `Withdraw to Balance`}
                </motion.button>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
