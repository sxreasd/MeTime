import { memo } from 'react';
import { motion } from 'motion/react';
import { CreditCard, ListChecks } from 'lucide-react';
import { SOFT_EASE } from '../utils/motion';

interface ComingSoonViewProps {
  variant: 'todo' | 'card';
}

export const ComingSoonView = memo(function ComingSoonView({ variant }: ComingSoonViewProps) {
  const isTodo = variant === 'todo';
  const Icon = isTodo ? ListChecks : CreditCard;
  const pageTitle = isTodo ? 'To-Do List' : 'Coming soon';
  const subtext = isTodo
    ? 'A to-do list to keep track of your tasks is in development.'
    : 'This feature is in development.';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent text-white">
      <header
        style={{ paddingTop: 'calc(max(12px, env(safe-area-inset-top, 0px)) + 14px)' }}
        className="relative z-10 px-6 pb-3"
      >
        <div className="relative flex h-11 items-center justify-center">
          <h1 className="text-[17px] leading-[1.2] font-semibold tracking-tight text-white">
            {pageTitle}
          </h1>
        </div>
      </header>

      <div
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.48, ease: SOFT_EASE }}
          className="flex w-full flex-col items-center rounded-[28px] border border-white/[0.08] bg-[#1A1D21]/92 px-6 py-10 shadow-[0_0_20px_rgba(99,75,196,0.14)]"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#6EEFA2]/25 bg-[#1C2124] text-[#6EEFA2] shadow-[0_0_18px_rgba(110,239,162,0.28)]">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight text-white">Coming soon</h2>
          <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-[#8E959B]">
            {subtext}
          </p>
        </motion.div>
      </div>
    </div>
  );
});
