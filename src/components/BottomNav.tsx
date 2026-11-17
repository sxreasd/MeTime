import { motion } from 'motion/react';
import { CreditCard, Home as HomeIcon, LayoutGrid } from 'lucide-react';
import { AppScreen } from '../types/money';
import { triggerFeedback } from '../utils/format';
import { useMoney } from '../context/MoneyContext';

interface BottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const { settings } = useMoney();

  const items: { id: AppScreen; label: string; icon: typeof HomeIcon }[] = [
    { id: 'grid', label: 'Overview', icon: LayoutGrid },
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-6"
    >
      <nav
        aria-label="Primary navigation"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#181B20] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
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
