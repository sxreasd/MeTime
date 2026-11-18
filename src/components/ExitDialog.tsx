import { memo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  SMALL_DURATION,
  SOFT_EASE,
  SOFT_TAP,
  SOFT_TAP_TRANSITION,
} from '../utils/motion';

interface ExitDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onExit: () => void;
}

export const ExitDialog = memo(function ExitDialog({
  isOpen,
  onStay,
  onExit,
}: ExitDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
            onClick={onStay}
            className="absolute inset-0 bg-black/75"
          />

          {/* Centered Dark Modal Card */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="exit-dialog-title"
            aria-describedby="exit-dialog-desc"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: SMALL_DURATION, ease: SOFT_EASE }}
            className="relative z-10 w-full max-w-[320px] rounded-[28px] border border-white/[0.09] bg-[#16191F] p-6 text-center text-white shadow-xl"
          >
            <h2 id="exit-dialog-title" className="text-[18px] font-bold tracking-tight text-white">
              Exit app?
            </h2>
            <p id="exit-dialog-desc" className="mt-2 text-[14px] text-[#9CA3AF]">
              Do you want to exit MeTime?
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileTap={SOFT_TAP}
                transition={SOFT_TAP_TRANSITION}
                onClick={onStay}
                className="min-h-[44px] rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-[#0B0F10] shadow-sm transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Stay
              </motion.button>
              <motion.button
                type="button"
                whileTap={SOFT_TAP}
                transition={SOFT_TAP_TRANSITION}
                onClick={onExit}
                className="min-h-[44px] rounded-full border border-white/10 bg-[#232830] px-4 py-2.5 text-[14px] font-medium text-[#E5E7EB] transition-colors duration-200 hover:bg-[#2C323B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Exit
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
