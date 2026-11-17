import { AnimatePresence, motion } from 'motion/react';

interface ExitDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onExit: () => void;
}

export function ExitDialog({ isOpen, onStay, onExit }: ExitDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onStay}
            className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
          />

          {/* Centered Dark Glassy Card */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="exit-dialog-title"
            aria-describedby="exit-dialog-desc"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative z-10 w-full max-w-[320px] rounded-[28px] border border-white/[0.09] bg-[#16191F]/90 p-6 text-center text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl"
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
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 700, damping: 32 }}
                onClick={onStay}
                className="min-h-[44px] rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-[#0B0F10] shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Stay
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 700, damping: 32 }}
                onClick={onExit}
                className="min-h-[44px] rounded-full border border-white/10 bg-[#232830] px-4 py-2.5 text-[14px] font-medium text-[#E5E7EB] hover:bg-[#2C323B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Exit
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
