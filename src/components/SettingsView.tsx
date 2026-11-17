import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  Download,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { useMoney } from '../context/MoneyContext';
import { formatCurrency, triggerFeedback } from '../utils/format';
import { AppBackground } from './AppBackground';

interface SettingsViewProps {
  onBack: () => void;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

const SWATCH_COLORS = [
  '#F59E0B',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#EF4444',
  '#06B6D4',
  '#84CC16',
];

const CURRENCY_OPTIONS = ['₱', '$', '€', '¥', '£'];

export function SettingsView({ onBack, registerBackHandler }: SettingsViewProps) {
  const {
    settings,
    categories,
    updateSettings,
    updateCategory,
    resetAllData,
    exportJSON,
    exportCSV,
  } = useMoney();

  const [nameInput, setNameInput] = useState(settings.name);
  const [startingInput, setStartingInput] = useState(String(settings.startingBalance));
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (confirmReset) {
        setConfirmReset(false);
        return true;
      }
      return false;
    });
    return () => registerBackHandler(null);
  }, [confirmReset, registerBackHandler]);

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2000);
  };

  const handleSaveProfile = () => {
    const parsedStart = parseFloat(startingInput);
    updateSettings({
      name: nameInput.trim() || 'MeTime User',
      startingBalance: Number.isFinite(parsedStart) ? Math.round(parsedStart * 100) / 100 : 0,
    });
    triggerFeedback(settings.hapticsEnabled, 'confirm');
    showToast('Settings saved');
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

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#05060D] text-white">
      <AppBackground />

      {/* Header */}
      <header
        style={{ paddingTop: 'max(1.35rem, env(safe-area-inset-top))' }}
        className="relative z-10 flex items-center justify-between px-6 pb-3"
      >
        <button
          type="button"
          aria-label="Back to Home"
          onClick={() => {
            triggerFeedback(settings.hapticsEnabled, 'tap');
            onBack();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-[#1C2124]/85 text-white transition-transform hover:bg-[#242A2E] active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="text-[17px] font-semibold tracking-tight text-white">Settings</h1>

        <div className="w-11" />
      </header>

      {/* Scrollable Content */}
      <div className="no-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto px-6 pt-2 pb-10">
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#1ED82B]/30 bg-[#1ED82B]/15 px-4 py-2.5 text-[13px] font-medium text-[#6EEFA2]"
          >
            <Check className="h-4 w-4" />
            <span>{savedToast}</span>
          </motion.div>
        )}

        {/* Profile & Balance Card */}
        <section className="rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-5 space-y-4">
          <h2 className="text-[15px] font-bold text-white">Profile & Wallet</h2>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#8E959B]">
              Profile Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#121518] px-4 py-2.5 text-[14px] text-white focus:border-white/30 focus:outline-none"
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
                      ? 'bg-white text-[#0B0F10]'
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
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveProfile}
            className="min-h-[44px] w-full rounded-full bg-white py-2.5 text-[14px] font-semibold text-[#0B0F10]"
          >
            Save Wallet Settings
          </motion.button>
        </section>

        {/* Preferences */}
        <section className="rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-5">
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
                settings.hapticsEnabled ? 'bg-[#1ED82B]' : 'bg-white/15'
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

        {/* Manage Categories */}
        <section className="rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-5 space-y-3">
          <h2 className="text-[15px] font-bold text-white">Manage Categories</h2>
          <p className="text-[12px] text-[#8E959B]">Rename or pick a new color dot</p>

          <div className="space-y-2.5 pt-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-white/[0.05] bg-[#121518] p-3 space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-white focus:outline-none"
                  />
                  <span className="text-[11px] font-medium text-[#6B7280] uppercase">
                    {cat.kind}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                  {SWATCH_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Set color ${hex}`}
                      onClick={() => {
                        triggerFeedback(settings.hapticsEnabled, 'tap');
                        updateCategory(cat.id, { color: hex });
                      }}
                      style={{ backgroundColor: hex }}
                      className={`h-4 w-4 rounded-full transition-transform ${
                        cat.color === hex ? 'scale-125 ring-2 ring-white/80' : 'opacity-65 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Export & Reset */}
        <section className="rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-5 space-y-3">
          <h2 className="text-[15px] font-bold text-white">Data Management</h2>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                downloadFile(exportJSON(), 'metime-backup.json', 'application/json')
              }
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121518] px-3 py-2.5 text-[13px] font-medium text-white hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => downloadFile(exportCSV(), 'metime-transactions.csv', 'text/csv')}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121518] px-3 py-2.5 text-[13px] font-medium text-white hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

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
                    setNameInput('MeTime User');
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
    </div>
  );
}
