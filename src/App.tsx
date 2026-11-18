import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import { MoneyProvider } from './context/MoneyContext';
import { AppScreen, ConfirmationData } from './types/money';
import { INTRO_TIMING, IntroSequence, IntroStage } from './components/IntroSequence';
import { PAGE_DURATION, SMALL_DURATION, SOFT_EASE } from './utils/motion';
import { Home } from './components/Home';
import { EntrySheet } from './components/EntrySheet';
import { ConfirmScreen } from './components/ConfirmScreen';
import { SavingsJar } from './components/SavingsJar';
import { Analytics } from './components/Analytics';
import { SettingsView } from './components/SettingsView';
import { ComingSoonView } from './components/ComingSoonView';
import { BottomNav } from './components/BottomNav';
import { ExitDialog } from './components/ExitDialog';
import {
  exitNativeApp,
  initNativeEdgeToEdge,
  isNativeCapacitor,
  registerNativeBackListener,
} from './utils/capacitor';

function buildStarburstPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 16,
  rotateDeg = 0
): string {
  const coords: string[] = [];
  const total = points * 2;
  const offsetRad = (rotateDeg * Math.PI) / 180;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = offsetRad + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return coords.join(' ');
}

const TOP_STARBURST = buildStarburstPoints(312, 198, 228, 48, 16, 11);
const BOTTOM_STARBURST = buildStarburstPoints(54, 756, 222, 46, 16, -9);

function MeTimeAppShell() {
  const [navStack, setNavStack] = useState<AppScreen[]>(['home']);
  const screen = navStack[navStack.length - 1];

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
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitToast, setExitToast] = useState(false);

  // Cold-start 3-phase intro state (runs once per launch; never replays on return to Home)
  const [introActive, setIntroActive] = useState(true);
  const [introStage, setIntroStage] = useState<IntroStage>('hidden');

  const switchBackdropToDark = useCallback(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = INTRO_TIMING.darkHex;
    document.body.style.backgroundColor = INTRO_TIMING.darkHex;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', '#0B0F10');
    }
  }, []);

  const handlePhaseBStart = useCallback(() => {
    switchBackdropToDark();
  }, [switchBackdropToDark]);

  const handleRevealStart = useCallback(() => {
    setIntroStage((prev) => (prev === 'hidden' ? 'reveal' : prev));
  }, []);

  const handleIntroSkip = useCallback(() => {
    switchBackdropToDark();
    setIntroStage('settled');
  }, [switchBackdropToDark]);

  const handleIntroComplete = useCallback(() => {
    switchBackdropToDark();
    setIntroStage('settled');
    setIntroActive(false);
  }, [switchBackdropToDark]);

  // Configure Capacitor edge-to-edge transparent status/nav bars
  useEffect(() => {
    initNativeEdgeToEdge();
  }, []);

  // Navigation stack helpers
  const navigateTo = useCallback((next: AppScreen) => {
    setNavStack((prev) => {
      const current = prev[prev.length - 1];
      if (current === next) return prev;
      if (next === 'home') return ['home'];
      if (next === 'todo' || next === 'card_soon') {
        return ['home', next];
      }
      return [...prev, next];
    });
  }, []);

  const popScreen = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  // Back interceptors for nested modals / dropdowns / expandable panels
  const entryBackRef = useRef<(() => boolean) | null>(null);
  const subModalBackRef = useRef<(() => boolean) | null>(null);
  const homeBackRef = useRef<(() => boolean) | null>(null);

  const registerEntryBack = useCallback((fn: (() => boolean) | null) => {
    entryBackRef.current = fn;
  }, []);

  const registerSubModalBack = useCallback((fn: (() => boolean) | null) => {
    subModalBackRef.current = fn;
  }, []);

  const registerHomeBack = useCallback((fn: (() => boolean) | null) => {
    homeBackRef.current = fn;
  }, []);

  // Unified hardware/browser back handler
  const backHandlerRef = useRef<() => void>(() => {});
  backHandlerRef.current = () => {
    if (introActive) return;

    if (showExitDialog) {
      setShowExitDialog(false);
      return;
    }

    if (confirmation) {
      setConfirmation(null);
      setNavStack(['home']);
      return;
    }

    if (entryState.open) {
      if (entryBackRef.current?.()) return;
      setEntryState((s) => ({ ...s, open: false, confirming: false }));
      return;
    }

    if (subModalBackRef.current?.()) {
      return;
    }

    if (screen === 'home' && homeBackRef.current?.()) {
      return;
    }

    if (navStack.length > 1) {
      popScreen();
      return;
    }

    setShowExitDialog(true);
  };

  useEffect(() => {
    if (isNativeCapacitor()) {
      return registerNativeBackListener(() => {
        backHandlerRef.current();
      });
    }

    try {
      window.history.replaceState({ metimeRoot: true }, '');
      window.history.pushState({ metimeGuard: true }, '');
    } catch {
      // Ignore if restricted
    }

    const onPopState = () => {
      try {
        window.history.pushState({ metimeGuard: true }, '');
      } catch {
        // Ignore
      }
      backHandlerRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Silently close the entry sheet underneath once the green expansion covers the viewport
  useEffect(() => {
    if (!entryState.confirming) return;
    const timer = setTimeout(() => {
      setEntryState((s) => ({ ...s, open: false, confirming: false }));
    }, 480);
    return () => clearTimeout(timer);
  }, [entryState.confirming]);

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    if (isNativeCapacitor()) {
      exitNativeApp();
      return;
    }
    window.close();
    setExitToast(true);
    setTimeout(() => setExitToast(false), 2600);
  };

  const isSubPage = screen === 'piggy' || screen === 'analytics' || screen === 'settings';

  return (
    <LayoutGroup>
      <div
        className={`flex h-dvh w-full items-center justify-center transition-colors duration-300 min-[501px]:p-4 ${
          introStage === 'hidden' ? 'bg-[#C85C5C] min-[501px]:bg-[#05060D]' : 'bg-[#05060D]'
        }`}
      >
        {/* True edge-to-edge on phones (<501px), centered phone frame only on desktop (>500px) */}
        <main className="relative h-full w-full overflow-hidden bg-[#05060D] min-[501px]:h-[min(860px,94dvh)] min-[501px]:max-w-[420px] min-[501px]:rounded-[40px] min-[501px]:border min-[501px]:border-white/[0.08] min-[501px]:shadow-2xl">
          {/* Single Fixed Static Vector Background (smooth CSS radial glows + crisp SVG starbursts) */}
          <motion.div
            aria-hidden="true"
            initial={introStage === 'hidden' ? { opacity: 0 } : false}
            animate={{ opacity: introStage === 'hidden' ? 0 : 1 }}
            transition={
              introStage === 'settled'
                ? { duration: INTRO_TIMING.skipFadeDuration, ease: 'easeOut' }
                : {
                    duration: INTRO_TIMING.home.backgroundDuration,
                    delay: INTRO_TIMING.home.backgroundDelay,
                    ease: INTRO_TIMING.home.ease,
                  }
            }
            style={{
              backgroundColor: '#05060D',
              backgroundImage: [
                'radial-gradient(66% 48% at 86% 24%, rgba(36, 44, 118, 0.44) 0%, rgba(16, 18, 52, 0.16) 54%, transparent 82%)',
                'radial-gradient(62% 44% at 14% 72%, rgba(86, 32, 102, 0.42) 0%, rgba(36, 14, 52, 0.15) 56%, transparent 84%)',
                'radial-gradient(45% 36% at 50% 42%, rgba(18, 22, 54, 0.25) 0%, transparent 75%)',
              ].join(', '),
            }}
            className="pointer-events-none fixed inset-0 z-0 min-[501px]:absolute"
          >
            <svg
              viewBox="0 0 390 844"
              preserveAspectRatio="xMidYMid slice"
              className="h-full w-full"
              fill="none"
            >
              <polygon
                points={TOP_STARBURST}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="0.85"
                vectorEffect="non-scaling-stroke"
              />
              <polygon
                points={BOTTOM_STARBURST}
                stroke="rgba(255,255,255,0.13)"
                strokeWidth="0.85"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </motion.div>

          {/* Underlying Screen Stack */}
          <div className="relative z-10 h-full w-full">
            <AnimatePresence initial={false}>
              <motion.div
                key={screen}
                initial={
                  isSubPage
                    ? { x: '100%', opacity: 0.85 }
                    : introStage === 'hidden'
                      ? false
                      : { opacity: 0, y: 8 }
                }
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={
                  isSubPage
                    ? { x: '100%', opacity: 0.85 }
                    : { opacity: 0, y: -6 }
                }
                transition={
                  isSubPage
                    ? { duration: PAGE_DURATION, ease: SOFT_EASE }
                    : { duration: 0.32, ease: SOFT_EASE }
                }
                className={`absolute inset-0 h-full w-full ${
                  isSubPage ? 'z-20' : 'z-10'
                }`}
              >
                {screen === 'home' && (
                  <Home
                    onNavigate={navigateTo}
                    onOpenEntry={(mode) =>
                      setEntryState({ open: true, confirming: false, mode })
                    }
                    introStage={introStage}
                    registerBackHandler={registerHomeBack}
                  />
                )}
                {screen === 'todo' && <ComingSoonView variant="todo" />}
                {screen === 'card_soon' && <ComingSoonView variant="card" />}
                {screen === 'piggy' && (
                  <SavingsJar onBack={popScreen} registerBackHandler={registerSubModalBack} />
                )}
                {screen === 'analytics' && (
                  <Analytics onBack={popScreen} registerBackHandler={registerSubModalBack} />
                )}
                {screen === 'settings' && (
                  <SettingsView onBack={popScreen} registerBackHandler={registerSubModalBack} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stationary Persistent Floating Bottom Navigation */}
          <AnimatePresence>
            {!isSubPage && (
              <BottomNav
                activeScreen={screen}
                onNavigate={navigateTo}
                introStage={introStage}
              />
            )}
          </AnimatePresence>

          {/* Cold-Start Mascot & Falling Red Layer Intro Sequence */}
          <IntroSequence
            active={introActive}
            onPhaseBStart={handlePhaseBStart}
            onRevealStart={handleRevealStart}
            onSkip={handleIntroSkip}
            onComplete={handleIntroComplete}
          />

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
            registerBackHandler={registerEntryBack}
          />

          {/* Full-Screen Green Confirmation */}
          <ConfirmScreen
            data={confirmation}
            onClose={() => {
              setConfirmation(null);
              setNavStack(['home']);
            }}
          />

          {/* Exit App Confirmation Dialog */}
          <ExitDialog
            isOpen={showExitDialog}
            onStay={() => setShowExitDialog(false)}
            onExit={handleConfirmExit}
          />

          {/* Subtle Browser-Tab Exit Toast if window.close() is blocked on desktop web */}
          <AnimatePresence>
            {exitToast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
                className="pointer-events-none absolute inset-x-6 bottom-24 z-50 rounded-full border border-white/10 bg-[#1A1D21] px-4 py-2.5 text-center text-[12px] font-medium text-white shadow-lg"
              >
                App session closed — you may close this tab.
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </LayoutGroup>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <MoneyProvider>
        <MeTimeAppShell />
      </MoneyProvider>
    </MotionConfig>
  );
}
