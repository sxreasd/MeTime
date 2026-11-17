import { motion } from 'motion/react';
import { CreditCard, ListChecks } from 'lucide-react';

interface ComingSoonViewProps {
  variant: 'todo' | 'card';
}

export function ComingSoonView({ variant }: ComingSoonViewProps) {
  const isTodo = variant === 'todo';
  const Icon = isTodo ? ListChecks : CreditCard;
  const pageTitle = isTodo ? 'To-Do List' : 'Coming soon';
  const subtext = isTodo
    ? 'A to-do list to keep track of your tasks is in development.'
    : 'This feature is in development.';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent text-white">
      <header
        style={{ paddingTop: 'max(1.35rem, env(safe-area-inset-top))' }}
        className="relative z-10 flex items-center justify-center px-6 pb-3"
      >
        <h1 className="text-[17px] font-semibold tracking-tight text-white">{pageTitle}</h1>
      </header>

      <div
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full flex-col items-center rounded-[28px] border border-white/[0.07] bg-[#1A1D21]/80 px-6 py-10 backdrop-blur-md"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1C2124] text-[#6EEFA2]">
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
}
