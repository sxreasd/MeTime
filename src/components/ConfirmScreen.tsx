import { AnimatePresence, motion } from 'motion/react';
import { ConfirmationData } from '../types/money';
import { formatCurrency } from '../utils/format';
import { useMoney } from '../context/MoneyContext';

interface ConfirmScreenProps {
  data: ConfirmationData | null;
  onClose: () => void;
}

export function ConfirmScreen({ data, onClose }: ConfirmScreenProps) {
  const { settings } = useMoney();

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Close confirmation"
          layoutId="confirm-green-morph"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClose();
          }}
          style={{ borderRadius: 0 }}
          exit={{
            opacity: 0,
            scale: 0.94,
            borderRadius: 28,
            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
          className="absolute inset-0 z-50 flex h-full w-full cursor-pointer flex-col items-center justify-between bg-[#1ED82B] px-8 py-14 text-center text-white focus:outline-none"
        >
          <div aria-hidden="true" className="h-6" />

          {/* Center Checkmark + Amount + Subtitle */}
          <div className="flex flex-col items-center">
            <motion.svg
              viewBox="0 0 64 64"
              className="mb-5 h-16 w-16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.path
                d="M14 33L26.5 45.5L50 19"
                stroke="#FFFFFF"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.42, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              />
            </motion.svg>

            <motion.p
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.12 }}
              className="text-[44px] leading-none font-bold tracking-tight text-white tabular-nums"
            >
              {formatCurrency(data.amount, settings.currency)}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.18 }}
              className="mt-3 text-[17px] font-medium text-white/95"
            >
              {data.subtitle}
            </motion.p>
          </div>

          {/* Bottom Dismiss Cue */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ delay: 0.26 }}
            className="text-[13px] font-medium text-white/80"
          >
            Tap anywhere to close
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
