import { motion, Variants } from 'motion/react';
import { CreditCard, Home as HomeIcon, LayoutGrid } from 'lucide-react';
import { AppScreen } from '../types/money';
import { triggerFeedback } from '../utils/format';
import { useMoney } from '../context/MoneyContext';
import { INTRO_TIMING, IntroStage } from './IntroSequence';

interface BottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  introStage?: IntroStage;
}

const navVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 64,
    scale: 0.94,
  },
  reveal: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...INTRO_TIMING.home.navSpring,
      delay: INTRO_TIMING.home.navDelay,
    },
  },
  settled: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: INTRO_TIMING.skipFadeDuration,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function BottomNav({
  activeScreen,
  onNavigate,
  introStage = 'settled',
}: BottomNavProps) {
  const { settings } = useMoney();

  const items: { id: AppScreen; label: string; icon: typeof HomeIcon }[] = [
    { id: 'todo', label: 'To-Do List', icon: LayoutGrid },
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'card_soon', label: 'Coming soon', icon: CreditCard },
  ];

  return (
    <motion.div
      variants={navVariants}
      initial={introStage === 'hidden' ? 'hidden' : { opacity: 0, y: 12, scale: 1 }}
      animate={introStage}
      exit={{ opacity: 0, y: 14 }}
      style={{ bottom: 'calc(1.15rem + env(safe-area-inset-bottom))' }}
      className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-6"
    >
      <nav
        aria-label="Primary navigation"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#181B20] p-1.5 shadow-lg"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (activeScreen === item.id) return;
                triggerFeedback(settings.hapticsEnabled, 'tap');
                onNavigate(item.id);
              }}
              className="relative flex min-h-[44px] min-w-[66px] items-center justify-center rounded-full px-5 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-active-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 520,
                    damping: 40,
                    mass: 0.7,
                  }}
                  className="absolute inset-0 rounded-full bg-white shadow-sm"
                />
              )}
              <Icon
                className={`relative z-10 h-[20px] w-[20px] transition-colors duration-150 ${
                  isActive ? 'text-[#111827] stroke-[2.2]' : 'text-[#8E959B] hover:text-white'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
