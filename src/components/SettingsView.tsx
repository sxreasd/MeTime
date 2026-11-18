import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, PanInfo, useDragControls } from 'motion/react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Download,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { generateRandomJarCircles, ImportDataSummary, useMoney } from '../context/MoneyContext';
import { CategoryConfig } from '../types/money';
import {
  ParsedImportPayload,
  parseImportedCSV,
  parseImportedJSON,
} from '../utils/dataTransfer';
import { formatCurrency, triggerFeedback } from '../utils/format';
import {
  SHEET_DURATION,
  SMALL_DURATION,
  SOFT_EASE,
  SOFT_PILL_SPRING,
  SOFT_TAP,
  SOFT_TAP_TRANSITION,
} from '../utils/motion';

interface SettingsViewProps {
  onBack: () => void;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

const PRESET_PALETTE = [
  '#F59E0B',
  '#FB923C',
  '#EF4444',
  '#EC4899',
  '#D946EF',
  '#8B5CF6',
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#10B981',
  '#22C55E',
  '#84CC16',
];

const CURRENCY_OPTIONS = ['₱', '$', '€', '¥', '£'];

export const SettingsView = memo(function SettingsView({ onBack, registerBackHandler }: SettingsViewProps) {
  const {
    settings,
    categories,
    transactions,
    updateSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    resetAllData,
    exportJSON,
    exportCSV,
    hasUserData,
    importData,
  } = useMoney();

  const [usernameInput, setUsernameInput] = useState(
    settings.username === 'MeTime User' ? '' : settings.username
  );
  const [startingInput, setStartingInput] = useState(String(settings.startingBalance));
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Import Data State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    payload: ParsedImportPayload;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Category Editor State
  const [catKindTab, setCatKindTab] = useState<'spend' | 'add'>('spend');
  const [catModalMode, setCatModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCat, setEditingCat] = useState<CategoryConfig | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catColorInput, setCatColorInput] = useState('#3B82F6');
  const [catError, setCatError] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState<CategoryConfig | null>(null);

  const catSheetDragControls = useDragControls();
  const catSheetRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (pendingImport) {
        setPendingImport(null);
        return true;
      }
      if (deletingCat) {
        setDeletingCat(null);
        return true;
      }
      if (catModalMode) {
        setCatModalMode(null);
        return true;
      }
      if (confirmReset) {
        setConfirmReset(false);
        return true;
      }
      return false;
    });
    return () => registerBackHandler(null);
  }, [pendingImport, deletingCat, catModalMode, confirmReset, registerBackHandler]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSavedToast(msg);
    toastTimerRef.current = setTimeout(() => setSavedToast(null), 2600);
  };

  const handleSaveSettings = () => {
    const parsedStart = parseFloat(startingInput);
    updateSettings({
      username: usernameInput.trim(),
      startingBalance: Number.isFinite(parsedStart) ? Math.round(parsedStart * 100) / 100 : 0,
    });
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    showToast('Settings saved');
  };

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === catKindTab),
    [categories, catKindTab]
  );

  const openAddCategory = () => {
    triggerFeedback(settings.hapticsEnabled, 'tap');
    setEditingCat(null);
    setCatNameInput('');
    setCatColorInput(PRESET_PALETTE[Math.floor(Math.random() * PRESET_PALETTE.length)]);
    setCatError(null);
    setCatModalMode('add');
  };

  const openEditCategory = (cat: CategoryConfig) => {
    triggerFeedback(settings.hapticsEnabled, 'tap');
    setEditingCat(cat);
    setCatNameInput(cat.name);
    setCatColorInput(cat.color);
    setCatError(null);
    setCatModalMode('edit');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = catNameInput.trim();
    const targetKind = editingCat ? editingCat.kind : catKindTab;
    const isEditingOthers = Boolean(
      editingCat && (editingCat.isOthers || editingCat.name.toLowerCase() === 'others')
    );

    if (!isEditingOthers && !clean) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setCatError('Please enter a category name.');
      return;
    }

    const isDuplicate = categories.some(
      (c) =>
        c.kind === targetKind &&
        c.id !== editingCat?.id &&
        c.name.trim().toLowerCase() === clean.toLowerCase()
    );

    if (!isEditingOthers && isDuplicate) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setCatError(`"${clean}" already exists.`);
      return;
    }

    if (catModalMode === 'add') {
      const created = addCategory({
        name: clean,
        color: catColorInput,
        kind: targetKind,
      });
      if (!created) {
        triggerFeedback(settings.hapticsEnabled, 'error');
        setCatError('Could not add category.');
        return;
      }
      triggerFeedback(settings.hapticsEnabled, 'confirm');
      setCatModalMode(null);
      showToast(`Added "${created.name}"`);
    } else if (catModalMode === 'edit' && editingCat) {
      updateCategory(editingCat.id, {
        name: isEditingOthers ? editingCat.name : clean,
        color: catColorInput,
      });
      triggerFeedback(settings.hapticsEnabled, 'confirm');
      setCatModalMode(null);
      showToast('Category updated');
    }
  };

  const affectedTxCount = useMemo(() => {
    if (!deletingCat) return 0;
    return transactions.filter(
      (t) =>
        t.category === deletingCat.name &&
        ((deletingCat.kind === 'spend' && t.type === 'spend') ||
          (deletingCat.kind === 'add' && t.type === 'add'))
    ).length;
  }, [deletingCat, transactions]);

  const handleConfirmDeleteCategory = () => {
    if (!deletingCat) return;
    const deletedName = deletingCat.name;
    deleteCategory(deletingCat.id);
    setDeletingCat(null);
    if (editingCat?.id === deletingCat.id) {
      setCatModalMode(null);
    }
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    showToast(`Deleted "${deletedName}"`);
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    triggerFeedback(settings.hapticsEnabled, 'tap');
    showToast(`Exported ${filename}`);
  };

  const formatImportSuccessToast = (summary: ImportDataSummary, mode: 'replace' | 'merge') => {
    const parts: string[] = [];
    if (summary.transactionsAdded > 0) {
      parts.push(
        `${summary.transactionsAdded} ${
          summary.transactionsAdded === 1 ? 'transaction' : 'transactions'
        }`
      );
    }
    if (summary.jarsAdded > 0) {
      parts.push(`${summary.jarsAdded} ${summary.jarsAdded === 1 ? 'jar' : 'jars'}`);
    }
    if (summary.categoriesAdded > 0) {
      parts.push(
        `${summary.categoriesAdded} ${
          summary.categoriesAdded === 1 ? 'category' : 'categories'
        }`
      );
    }
    if (parts.length > 0) {
      return `Imported ${parts.join(', ')}`;
    }
    if (summary.settingsUpdated) {
      return 'Restored settings from backup';
    }
    if (mode === 'merge') {
      return 'No new records found (all already exist)';
    }
    return 'Imported 0 records';
  };

  const applyImport = (payload: ParsedImportPayload, mode: 'replace' | 'merge') => {
    const summary = importData(payload, mode);
    if (mode === 'replace' && payload.format === 'json' && payload.settings) {
      if (payload.settings.username !== undefined) {
        setUsernameInput(
          payload.settings.username === 'MeTime User' ? '' : payload.settings.username
        );
      }
      if (payload.settings.startingBalance !== undefined) {
        setStartingInput(String(payload.settings.startingBalance));
      }
    }
    setPendingImport(null);
    setImportError(null);
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    showToast(formatImportSuccessToast(summary, mode));
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input so user can re-upload the exact same file again
    e.target.value = '';
    if (!file) return;

    setImportError(null);
    const lowerName = file.name.toLowerCase();
    const isJSON = lowerName.endsWith('.json') || file.type === 'application/json';
    const isCSV =
      lowerName.endsWith('.csv') ||
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel';

    if (!isJSON && !isCSV) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setImportError('Unsupported file format. Please choose a .csv or .json file.');
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setImportError('Unable to read the selected file.');
      return;
    }

    const result = isJSON
      ? parseImportedJSON(text, generateRandomJarCircles)
      : parseImportedCSV(text, generateRandomJarCircles);

    if (!result.ok) {
      triggerFeedback(settings.hapticsEnabled, 'error');
      setImportError(result.error);
      return;
    }

    if (hasUserData) {
      triggerFeedback(settings.hapticsEnabled, 'tap');
      setPendingImport({ fileName: file.name, payload: result.data });
    } else {
      applyImport(result.data, 'replace');
    }
  };

  const isEditingOthers = Boolean(
    editingCat && (editingCat.isOthers || editingCat.name.toLowerCase() === 'others')
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent text-white">
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(max(12px, env(safe-area-inset-top, 0px)) + 14px)' }}
        className="relative z-10 px-6 pb-3"
      >
        <div className="relative flex h-11 items-center justify-between">
          <button
            type="button"
            aria-label="Back to Home"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              onBack();
            }}
            className="soft-press flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#1C2124]/85 text-white transition-colors duration-200 hover:bg-[#242A2E]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h1 className="text-[17px] leading-[1.2] font-semibold tracking-tight text-white">
            Settings
          </h1>

          <div className="w-11" />
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="no-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto px-6 pt-2 pb-10">

        {/* Username & Balance Card */}
        <section className="space-y-4 rounded-[24px] border border-white/[0.08] bg-[#161922]/88 p-5 shadow-[0_0_20px_rgba(99,75,196,0.12)]">
          <h2 className="text-[15px] font-bold text-white">Username & Wallet</h2>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
              Username
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter username (optional)"
              className="w-full rounded-2xl border border-white/10 bg-[#121518] px-4 py-2.5 text-[14px] text-white placeholder:text-[#6B7280] focus:border-white/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
              Currency Symbol
            </label>
            <div className="flex items-center gap-2">
              {CURRENCY_OPTIONS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    triggerFeedback(settings.hapticsEnabled, 'tap');
                    updateSettings({ currency: sym });
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-semibold transition-colors ${
                    settings.currency === sym
                      ? 'bg-white text-[#0B0F10] shadow-[0_0_12px_rgba(255,255,255,0.22)]'
                      : 'border border-white/10 bg-[#121518] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
              Starting Balance ({settings.currency})
            </label>
            <input
              type="number"
              step="any"
              value={startingInput}
              onChange={(e) => setStartingInput(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#121518] px-4 py-2.5 text-[14px] text-white tabular-nums focus:border-white/30 focus:outline-none"
            />
          </div>

          <motion.button
            type="button"
            whileTap={SOFT_TAP}
            transition={SOFT_TAP_TRANSITION}
            onClick={handleSaveSettings}
            className="min-h-[44px] w-full rounded-full bg-white py-2.5 text-[14px] font-semibold text-[#0B0F10] shadow-[0_0_14px_rgba(255,255,255,0.18)]"
          >
            Save Wallet Settings
          </motion.button>
        </section>

        {/* Preferences */}
        <section className="rounded-[24px] border border-white/[0.08] bg-[#161922]/88 p-5 shadow-[0_0_20px_rgba(99,75,196,0.12)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-[#C8CFD5]">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">Haptic & Sound Feedback</p>
                <p className="text-[12px] text-[#8E959B]">Subtle clicks and confirmation chime</p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.hapticsEnabled}
              onClick={() => updateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                settings.hapticsEnabled
                  ? 'bg-[#1ED82B] shadow-[0_0_12px_rgba(30,216,43,0.4)]'
                  : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Categories Editor */}
        <section className="space-y-3.5 rounded-[24px] border border-white/[0.08] bg-[#161922]/88 p-5 shadow-[0_0_20px_rgba(99,75,196,0.14)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold text-white">Categories</h2>
              <p className="text-[12px] text-[#8E959B]">
                Edit names, colors, or add new categories
              </p>
            </div>

            <motion.button
              type="button"
              whileTap={SOFT_TAP}
              transition={SOFT_TAP_TRANSITION}
              onClick={openAddCategory}
              className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#0B0F10] shadow-[0_0_14px_rgba(255,255,255,0.2)] transition-colors duration-200 hover:bg-neutral-100"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add category</span>
            </motion.button>
          </div>

          {/* Spend / Add Tab Toggle */}
          <div className="inline-flex rounded-full border border-white/[0.07] bg-[#11141B] p-1">
            {(
              [
                { id: 'spend', label: 'Spending' },
                { id: 'add', label: 'Income' },
              ] as const
            ).map((tab) => {
              const active = catKindTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerFeedback(settings.hapticsEnabled, 'tap');
                    setCatKindTab(tab.id);
                  }}
                  className={`relative rounded-full px-4 py-1.5 text-[12px] transition-colors duration-200 ${
                    active
                      ? 'font-semibold text-[#0B0F10]'
                      : 'font-medium text-[#8E959B] hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-cat-kind-pill"
                      transition={SOFT_PILL_SPRING}
                      className="absolute inset-0 rounded-full bg-white"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Category List */}
          <div className="space-y-2 pt-0.5">
            {visibleCategories.map((cat) => {
              const isDefaultOthers = Boolean(
                cat.isOthers || cat.name.toLowerCase() === 'others'
              );
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#101319] px-3.5 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => openEditCategory(cat)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/20"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: `0 0 12px ${cat.color}88`,
                      }}
                    />
                    <span className="truncate text-[14px] font-medium text-white">
                      {cat.name}
                    </span>
                    {isDefaultOthers && (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF]">
                        Default
                      </span>
                    )}
                  </button>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Edit ${cat.name}`}
                      onClick={() => openEditCategory(cat)}
                      className="soft-press flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-[#C8CFD5] transition-colors duration-200 hover:bg-white/[0.12] hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {!isDefaultOthers && (
                      <button
                        type="button"
                        aria-label={`Delete ${cat.name}`}
                        onClick={() => {
                          triggerFeedback(settings.hapticsEnabled, 'tap');
                          setDeletingCat(cat);
                        }}
                        className="soft-press flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-400 transition-colors duration-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Export & Reset */}
        <section className="space-y-3 rounded-[24px] border border-white/[0.08] bg-[#161922]/88 p-5 shadow-[0_0_20px_rgba(99,75,196,0.12)]">
          <h2 className="text-[15px] font-bold text-white">Data Management</h2>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                downloadFile(exportJSON(), 'metime-backup.json', 'application/json')
              }
              className="soft-press flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121518] px-3 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => downloadFile(exportCSV(), 'metime-transactions.csv', 'text/csv')}
              className="soft-press flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121518] px-3 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerFeedback(settings.hapticsEnabled, 'tap');
                setImportError(null);
                fileInputRef.current?.click();
              }}
              className="soft-press col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121518] px-3 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-white/5"
            >
              <Upload className="h-4 w-4" />
              <span>Import (.csv / .json)</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleImportFileChange}
            className="hidden"
          />

          {importError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-red-200"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <span>{importError}</span>
              </div>
              <button
                type="button"
                aria-label="Dismiss import error"
                onClick={() => setImportError(null)}
                className="shrink-0 text-red-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 py-2.5 text-[13px] font-semibold text-red-400 hover:bg-red-500/15"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset All Data</span>
            </button>
          ) : (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-center">
              <p className="text-[12px] text-red-200">
                Reset balance to {formatCurrency(0, settings.currency)}, clear all transactions and
                jars?
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded-full bg-white/10 py-2 text-[12px] font-medium text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAllData();
                    setUsernameInput('');
                    setStartingInput('0');
                    setConfirmReset(false);
                    triggerFeedback(settings.hapticsEnabled, 'confirm');
                    showToast('All data reset to zero');
                  }}
                  className="flex-1 rounded-full bg-red-500 py-2 text-[12px] font-semibold text-white"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit Category Bottom Sheet */}
      <AnimatePresence>
        {catModalMode && (
          <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
              onClick={() => setCatModalMode(null)}
              className="absolute inset-0 bg-black/70"
            />
            <div className="pointer-events-none relative z-10 flex h-full w-full items-end overflow-hidden min-[501px]:max-w-[420px] min-[501px]:rounded-[38px]">
              <motion.form
                ref={catSheetRef}
                onSubmit={handleSaveCategory}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: SHEET_DURATION, ease: SOFT_EASE }}
                drag="y"
                dragControls={catSheetDragControls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.9 }}
                dragSnapToOrigin
                dragTransition={{ bounceStiffness: 135, bounceDamping: 24 }}
                onDragStart={() => {
                  if (catSheetRef.current) catSheetRef.current.style.willChange = 'transform';
                }}
                onDragEnd={(_e, info: PanInfo) => {
                  if (catSheetRef.current) catSheetRef.current.style.willChange = 'auto';
                  const sheetHeight = catSheetRef.current?.offsetHeight || 420;
                  if (info.offset.y > sheetHeight * 0.3 || info.velocity.y > 420) {
                    setCatModalMode(null);
                  }
                }}
                style={{ paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom))' }}
                className="pointer-events-auto flex max-h-[88dvh] w-full flex-col rounded-t-[32px] border-t border-white/10 bg-[#141820] px-6 pt-3 text-white shadow-2xl"
              >
                <div
                  onPointerDown={(e) => catSheetDragControls.start(e)}
                  className="-mx-6 cursor-grab touch-none px-6 pt-1 pb-3 active:cursor-grabbing"
                >
                  <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/25" />
                  <h2 className="text-[18px] font-bold">
                    {catModalMode === 'add'
                      ? `New ${catKindTab === 'spend' ? 'Spending' : 'Income'} Category`
                      : 'Edit Category'}
                  </h2>
                </div>

                <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto pt-1">
                  {/* Live Chosen Color & Name Preview */}
                  <div
                    style={{
                      borderColor: `${catColorInput}55`,
                      backgroundColor: `${catColorInput}16`,
                      boxShadow: `0 0 22px ${catColorInput}2E`,
                    }}
                    className="flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/25"
                        style={{
                          backgroundColor: catColorInput,
                          boxShadow: `0 0 14px ${catColorInput}AA`,
                        }}
                      />
                      <span className="truncate text-[15px] font-semibold text-white">
                        {catNameInput.trim() || 'Category Preview'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-white/60">Preview</span>
                  </div>

                  {/* Category Name */}
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={catNameInput}
                      disabled={isEditingOthers}
                      autoFocus={!isEditingOthers}
                      onChange={(e) => {
                        setCatNameInput(e.target.value);
                        if (catError) setCatError(null);
                      }}
                      placeholder="e.g. Groceries, Bills, Coffee"
                      className="w-full rounded-2xl border border-white/10 bg-[#1C212A] px-4 py-3 text-[15px] text-white placeholder:text-[#6B7280] focus:border-white/30 focus:outline-none disabled:opacity-55"
                    />
                    {isEditingOthers && (
                      <p className="mt-1.5 text-[11px] text-[#8E959B]">
                        &ldquo;Others&rdquo; is the default fallback category — you can customize its
                        color.
                      </p>
                    )}
                    {catError && <p className="mt-1.5 text-[12px] text-red-400">{catError}</p>}
                  </div>

                  {/* Visual Color Palette Selector (Grid + Native Color Picker, no hex typing) */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#8E959B]">
                      Choose Color
                    </label>

                    <div className="grid grid-cols-6 gap-2.5">
                      {PRESET_PALETTE.map((hex) => {
                        const selected = catColorInput.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            type="button"
                            aria-label={`Select color ${hex}`}
                            onClick={() => {
                              triggerFeedback(settings.hapticsEnabled, 'tap');
                              setCatColorInput(hex);
                            }}
                            style={{
                              backgroundColor: hex,
                              boxShadow: selected
                                ? `0 0 16px ${hex}99`
                                : `0 0 8px ${hex}33`,
                            }}
                            className={`flex h-11 w-full items-center justify-center rounded-2xl transition-transform active:scale-90 ${
                              selected
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141820]'
                                : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            {selected && <Check className="h-4.5 w-4.5 stroke-[3] text-white drop-shadow" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Visual Custom Color Picker Button */}
                    <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-[#1C212A] px-4 py-2.5 transition-colors hover:bg-[#232934]">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          style={{
                            background:
                              'conic-gradient(#EF4444, #F59E0B, #22C55E, #06B6D4, #3B82F6, #A855F7, #EC4899, #EF4444)',
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-white/30"
                        >
                          <Palette className="h-3.5 w-3.5 text-white drop-shadow" />
                        </span>
                        <span className="text-[13px] font-medium text-white">
                          Custom color picker
                        </span>
                      </div>

                      <span
                        className="h-6 w-10 rounded-full border border-white/25"
                        style={{
                          backgroundColor: catColorInput,
                          boxShadow: `0 0 12px ${catColorInput}66`,
                        }}
                      />
                      <input
                        type="color"
                        aria-label="Custom color picker"
                        value={catColorInput}
                        onChange={(e) => setCatColorInput(e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-2">
                    <motion.button
                      type="submit"
                      whileTap={SOFT_TAP}
                      transition={SOFT_TAP_TRANSITION}
                      className="min-h-[48px] w-full rounded-full bg-white py-3 text-[15px] font-semibold text-[#0B0F10] shadow-[0_0_18px_rgba(255,255,255,0.2)] transition-colors duration-200 hover:bg-neutral-100"
                    >
                      {catModalMode === 'add' ? 'Add Category' : 'Save Changes'}
                    </motion.button>

                    {catModalMode === 'edit' && editingCat && !isEditingOthers && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerFeedback(settings.hapticsEnabled, 'tap');
                          setDeletingCat(editingCat);
                        }}
                        className="soft-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 py-2.5 text-[14px] font-medium text-red-400 transition-colors duration-200 hover:bg-red-500/15"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Category</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Category Confirmation Dialog */}
      <AnimatePresence>
        {deletingCat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
              onClick={() => setDeletingCat(null)}
              className="absolute inset-0 bg-black/75"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
              className="relative z-10 w-full max-w-[340px] rounded-[26px] border border-white/10 bg-[#161922] p-5 text-center text-white shadow-[0_0_28px_rgba(239,68,68,0.22)]"
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-[17px] font-bold">Delete &ldquo;{deletingCat.name}&rdquo;?</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#9CA3AF]">
                {affectedTxCount > 0
                  ? `${affectedTxCount} existing ${
                      affectedTxCount === 1 ? 'transaction uses' : 'transactions use'
                    } this category and will be moved to "Others".`
                  : 'This category will be removed. Any transactions using it will move to "Others".'}
              </p>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingCat(null)}
                  className="soft-press min-h-[42px] flex-1 rounded-full bg-white/10 text-[13px] font-medium text-white hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  className="soft-press min-h-[42px] flex-1 rounded-full bg-red-500 text-[13px] font-semibold text-white shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Replace vs Merge Import Confirmation Dialog */}
      <AnimatePresence>
        {pendingImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
              onClick={() => setPendingImport(null)}
              className="absolute inset-0 bg-black/75"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-mode-title"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
              className="relative z-10 w-full max-w-[340px] rounded-[26px] border border-white/10 bg-[#161922] p-5 text-center text-white shadow-[0_0_28px_rgba(99,75,196,0.24)]"
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
                <Upload className="h-5 w-5" />
              </div>
              <h3 id="import-mode-title" className="text-[17px] font-bold">
                Import {pendingImport.payload.format.toUpperCase()} Data
              </h3>
              <p className="mt-1 truncate px-2 text-[12px] font-medium text-[#A5B4FC]">
                {pendingImport.fileName}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#9CA3AF]">
                {(() => {
                  const c = pendingImport.payload.summaryCounts;
                  const bits: string[] = [];
                  if (c.transactions > 0) {
                    bits.push(
                      `${c.transactions} ${c.transactions === 1 ? 'transaction' : 'transactions'}`
                    );
                  }
                  if (c.jars > 0) {
                    bits.push(`${c.jars} ${c.jars === 1 ? 'jar' : 'jars'}`);
                  }
                  if (c.categories > 0) {
                    bits.push(`${c.categories} ${c.categories === 1 ? 'category' : 'categories'}`);
                  }
                  const summaryText = bits.length > 0 ? bits.join(', ') : 'backup settings';
                  return `Ready to import ${summaryText}. Choose whether to merge with your existing data or replace it.`;
                })()}
              </p>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => applyImport(pendingImport.payload, 'merge')}
                  className="soft-press min-h-[44px] w-full rounded-full bg-white text-[13px] font-semibold text-[#0B0F10] shadow-[0_0_16px_rgba(255,255,255,0.18)] hover:bg-neutral-100"
                >
                  Merge with Existing
                </button>
                <button
                  type="button"
                  onClick={() => applyImport(pendingImport.payload, 'replace')}
                  className="soft-press min-h-[44px] w-full rounded-full border border-red-500/30 bg-red-500/15 text-[13px] font-semibold text-red-300 hover:bg-red-500/25"
                >
                  Replace Existing Data
                </button>
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="soft-press min-h-[40px] w-full rounded-full bg-white/[0.06] text-[13px] font-medium text-[#9CA3AF] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Feedback Toast */}
      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            className="pointer-events-none absolute inset-x-6 z-40 mx-auto flex max-w-[340px] items-center justify-center gap-2 rounded-full border border-[#1ED82B]/35 bg-[#121B17]/95 px-4 py-2.5 text-[13px] font-medium text-[#6EEFA2] shadow-[0_0_18px_rgba(30,216,43,0.22)]"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">{savedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
