import { memo, useLayoutEffect, useRef } from 'react';
import { animate, AnimatePresence, motion, useMotionValue } from 'motion/react';
import { ConfirmationData } from '../types/money';
import { formatCurrency } from '../utils/format';
import { DECEL_EASE, SOFT_EASE } from '../utils/motion';
import { useMoney } from '../context/MoneyContext';

interface ConfirmScreenProps {
  data: ConfirmationData | null;
  onClose: () => void;
}

export const ConfirmScreen = memo(function ConfirmScreen({ data, onClose }: ConfirmScreenProps) {
  const { settings } = useMoney();
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const bgX = useMotionValue(0);
  const bgY = useMotionValue(0);
  const bgScaleX = useMotionValue(1);
  const bgScaleY = useMotionValue(1);

  // Measure swipe-box origin synchronously before paint and grow via pure transform: scale/translate
  useLayoutEffect(() => {
    if (!data) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      bgX.set(0);
      bgY.set(0);
      bgScaleX.set(1);
      bgScaleY.set(1);
      return;
    }

    const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
    const targetW = parentRect?.width || window.innerWidth;
    const targetH = parentRect?.height || window.innerHeight;
    const targetTop = parentRect?.top ?? 0;
    const targetLeft = parentRect?.left ?? 0;

    if (data.originRect && targetW > 0 && targetH > 0) {
      const originCenterX = data.originRect.left + data.originRect.width / 2;
      const originCenterY = data.originRect.top + data.originRect.height / 2;
      const targetCenterX = targetLeft + targetW / 2;
      const targetCenterY = targetTop + targetH / 2;

      bgX.set(originCenterX - targetCenterX);
      bgY.set(originCenterY - targetCenterY);
      bgScaleX.set(Math.max(0.2, Math.min(1, data.originRect.width / targetW)));
      bgScaleY.set(Math.max(0.12, Math.min(1, data.originRect.height / targetH)));
    } else {
      bgX.set(0);
      bgY.set(0);
      bgScaleX.set(0.92);
      bgScaleY.set(0.92);
    }

    if (bgRef.current) {
      bgRef.current.style.willChange = 'transform';
    }

    const transition = { duration: 0.56, ease: DECEL_EASE } as const;
    const controls = [
      animate(bgX, 0, transition),
      animate(bgY, 0, transition),
      animate(bgScaleX, 1, transition),
      animate(bgScaleY, 1, {
        ...transition,
        onComplete: () => {
          if (bgRef.current) bgRef.current.style.willChange = 'auto';
        },
      }),
    ];

    return () => {
      controls.forEach((c) => c.stop());
      if (bgRef.current) bgRef.current.style.willChange = 'auto';
    };
  }, [data, bgX, bgY, bgScaleX, bgScaleY]);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          ref={containerRef}
          role="button"
          tabIndex={0}
          aria-label="Close confirmation"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClose();
          }}
          style={{
            paddingTop: 'max(3.5rem, env(safe-area-inset-top))',
            paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))',
          }}
          initial={{ opacity: 0.96 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.96,
            transition: { duration: 0.34, ease: SOFT_EASE },
          }}
          className="absolute inset-0 z-50 flex h-full w-full cursor-pointer flex-col items-center justify-between overflow-hidden px-8 text-center text-white focus:outline-none"
        >
          {/* Fixed-size green backdrop scaled smoothly via pure GPU transform */}
          <motion.div
            ref={bgRef}
            aria-hidden="true"
            style={{
              x: bgX,
              y: bgY,
              scaleX: bgScaleX,
              scaleY: bgScaleY,
            }}
            className="pointer-events-none absolute inset-0 bg-[#1ED82B]"
          />

          <div aria-hidden="true" className="relative z-10 h-6" />

          {/* Center Checkmark + Amount + Subtitle */}
          <div className="relative z-10 flex flex-col items-center">
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
                transition={{ duration: 0.52, delay: 0.14, ease: DECEL_EASE }}
              />
            </motion.svg>

            <motion.p
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.44, delay: 0.16, ease: DECEL_EASE }}
              className="text-[44px] leading-none font-bold tracking-tight text-white tabular-nums"
            >
              {formatCurrency(data.amount, settings.currency)}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.24, ease: SOFT_EASE }}
              className="mt-3 text-[17px] font-medium text-white/95"
            >
              {data.subtitle}
            </motion.p>
          </div>

          {/* Bottom Dismiss Cue */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.36, delay: 0.34, ease: SOFT_EASE }}
            className="relative z-10 text-[13px] font-medium text-white/80"
          >
            Tap anywhere to close
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
