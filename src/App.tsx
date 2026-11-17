import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { MoneyProvider } from './context/MoneyContext';
import { AppScreen, ConfirmationData } from './types/money';
import { Home } from './components/Home';
import { EntrySheet } from './components/EntrySheet';
import { ConfirmScreen } from './components/ConfirmScreen';
import { PiggyBank } from './components/PiggyBank';
import { Analytics } from './components/Analytics';
import { TransactionsView } from './components/TransactionsView';
import { SettingsView } from './components/SettingsView';
import { ComingSoonView } from './components/ComingSoonView';
import { BottomNav } from './components/BottomNav';

function MeTimeAppShell() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [entryState, setEntryState] = useState<{
    open: boolean;
    confirming: boolean;
    mode: 'spend' | 'add';
  }>({
    open: false,
    confirming: false,
    mode: 'spend',
  });
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  const isSubPage = screen === 'piggy' || screen === 'analytics' || screen === 'settings';

  // Silently close the entry sheet underneath once the green morph finishes expanding
  useEffect(() => {
    if (!entryState.confirming) return;
    const timer = setTimeout(() => {
      setEntryState((s) => ({ ...s, open: false, confirming: false }));
    }, 320);
    return () => clearTimeout(timer);
  }, [entryState.confirming]);

  return (
    <LayoutGroup>
      <div className="flex min-h-dvh w-full items-center justify-center bg-[#050708] sm:p-4">
        {/* Centered Phone-Sized Frame (max-width ~420px) */}
        <main className="relative h-dvh w-full max-w-[420px] overflow-hidden bg-[#0B0F10] sm:h-[min(860px,94dvh)] sm:rounded-[40px] sm:border sm:border-white/[0.08] sm:shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
          {/* Overlapping Screen Stack — zero wait pause on tap */}
          <div className="relative h-full w-full">
            <AnimatePresence initial={false}>
              <motion.div
                key={screen}
                initial={
                  isSubPage
                    ? { x: '100%', opacity: 1 }
                    : { opacity: 0 }
                }
                animate={{ x: 0, opacity: 1 }}
                exit={
                  isSubPage
                    ? { x: '100%', opacity: 0.9 }
                    : { opacity: 0 }
                }
                transition={
                  isSubPage
                    ? { type: 'spring', stiffness: 420, damping: 38, mass: 0.85 }
                    : { duration: 0.14, ease: 'easeOut' }
                }
                className={`absolute inset-0 h-full w-full ${
                  isSubPage ? 'z-20' : 'z-10'
                }`}
              >
                {screen === 'home' && (
                  <Home
                    onNavigate={setScreen}
                    onOpenEntry={(mode) =>
                      setEntryState({ open: true, confirming: false, mode })
                    }
                  />
                )}
                {screen === 'grid' && <ComingSoonView />}
                {screen === 'transactions' && <TransactionsView />}
                {screen === 'piggy' && <PiggyBank onBack={() => setScreen('home')} />}
                {screen === 'analytics' && <Analytics onBack={() => setScreen('home')} />}
                {screen === 'settings' && <SettingsView onBack={() => setScreen('home')} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stationary Persistent Floating Bottom Navigation */}
          <AnimatePresence>
            {!isSubPage && <BottomNav activeScreen={screen} onNavigate={setScreen} />}
          </AnimatePresence>

          {/* Spend / Add Bottom Sheet */}
          <EntrySheet
            isOpen={entryState.open}
            isConfirming={entryState.confirming}
            initialMode={entryState.mode}
            onClose={() =>
              setEntryState((s) => ({ ...s, open: false, confirming: false }))
            }
            onConfirm={(data) => {
              setEntryState((s) => ({ ...s, confirming: true }));
              setConfirmation(data);
            }}
          />

          {/* Full-Screen Green Confirmation (morphed from EntrySheet card) */}
          <ConfirmScreen data={confirmation} onClose={() => setConfirmation(null)} />
        </main>
      </div>
    </LayoutGroup>
  );
}

export default function App() {
  return (
    <MoneyProvider>
      <MeTimeAppShell />
    </MoneyProvider>
  );
}
