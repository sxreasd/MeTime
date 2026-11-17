import { useEffect, useRef, useState } from 'react';
import { motion, useAnimate } from 'motion/react';

export type IntroStage = 'hidden' | 'reveal' | 'settled';

/**
 * Single centralized timing configuration (seconds) for the cold-start intro.
 * Adjust any phase duration, stagger, or easing curve here.
 */
export const INTRO_TIMING = {
  // Colors matching the app icon & native Android splash
  redHex: '#C85C5C',
  darkHex: '#05060D',

  // Phase A: Mascot on solid red screen (0.0s -> 2.0s)
  popInDelay: 0.1,
  popInDuration: 0.34,
  popInEase: [0.22, 1, 0.36, 1] as const,
  skippableAfterMs: 320,

  // Wink timing: crossfade right oval -> '<' chevron, hold, crossfade back (no body bounce)
  winkStart: 1.0,
  winkTransitionDuration: 0.12,
  winkHoldDuration: 0.35,
  winkEase: 'easeInOut' as const,

  // Phase B: Fall transition (2.0s -> ~3.0s)
  fallStart: 2.0,
  mascotFallDuration: 0.8,
  mascotFallRotateDeg: 14,
  sheetFallDuration: 0.98,
  sheetFallRotateDeg: -4.5,
  sheetCornerDuration: 0.2,
  fallEase: [0.46, 0, 0.86, 0.44] as const,

  // Phase C: Home elements ease in from separate lanes (starts at 2.6s -> settles ~4.6s)
  revealStartDelay: 2.6,
  totalIntroDurationMs: 4600,
  skipFadeDuration: 0.22,
  reducedMotionHoldMs: 1000,
  reducedMotionFadeMs: 350,

  // Relative delays inside Phase C (measured from revealStartDelay = 2.6s)
  home: {
    ease: [0.22, 1, 0.36, 1] as const,
    backgroundDelay: 0.0,
    backgroundDuration: 0.9,
    headerTitleDelay: 0.08,
    headerTitleDuration: 0.68,
    headerGearDelay: 0.16,
    headerGearDuration: 0.68,
    balanceDelay: 0.26,
    balanceDuration: 0.74,
    balanceCountDuration: 0.95,
    spendPillDelay: 0.38,
    addPillDelay: 0.48,
    pillDuration: 0.68,
    cardsDelay: 0.58,
    cardsDuration: 0.78,
    panelDelay: 0.7,
    panelDuration: 0.86,
    navDelay: 0.95,
    navSpring: {
      type: 'spring' as const,
      stiffness: 230,
      damping: 19,
      mass: 0.92,
    },
  },
} as const;

interface IntroSequenceProps {
  active: boolean;
  onPhaseBStart?: () => void;
  onRevealStart: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function IntroSequence({
  active,
  onPhaseBStart,
  onRevealStart,
  onSkip,
  onComplete,
}: IntroSequenceProps) {
  const [scope, animate] = useAnimate();
  const [canSkip, setCanSkip] = useState(false);
  const finishedRef = useRef(false);
  const cancelledRef = useRef(false);

  const onPhaseBStartRef = useRef(onPhaseBStart);
  const onRevealStartRef = useRef(onRevealStart);
  const onSkipRef = useRef(onSkip);
  const onCompleteRef = useRef(onComplete);
  onPhaseBStartRef.current = onPhaseBStart;
  onRevealStartRef.current = onRevealStart;
  onSkipRef.current = onSkip;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    cancelledRef.current = false;
    finishedRef.current = false;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setCanSkip(true);
      if (scope.current) {
        animate('[data-intro-mascot]', { opacity: 1, scale: 1 }, { duration: 0 });
      }
      const holdTimer = setTimeout(async () => {
        if (cancelledRef.current || finishedRef.current) return;
        onPhaseBStartRef.current?.();
        onSkipRef.current();
        if (scope.current) {
          await animate(
            scope.current,
            { opacity: 0 },
            { duration: INTRO_TIMING.reducedMotionFadeMs / 1000, ease: 'easeOut' }
          );
        }
        if (!cancelledRef.current && !finishedRef.current) {
          finishedRef.current = true;
          onCompleteRef.current();
        }
      }, INTRO_TIMING.reducedMotionHoldMs);

      return () => {
        cancelledRef.current = true;
        clearTimeout(holdTimer);
      };
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Allow tap-to-skip once mascot has appeared
    timers.push(
      setTimeout(() => {
        if (!cancelledRef.current) setCanSkip(true);
      }, INTRO_TIMING.skippableAfterMs)
    );

    // Phase B trigger at 2.0s: update document dark backdrop underneath & start drop
    timers.push(
      setTimeout(() => {
        if (!cancelledRef.current && !finishedRef.current) {
          onPhaseBStartRef.current?.();
        }
      }, INTRO_TIMING.fallStart * 1000)
    );

    // Phase C trigger at 2.6s: reveal Home elements while red card is still dropping
    timers.push(
      setTimeout(() => {
        if (!cancelledRef.current && !finishedRef.current) {
          onRevealStartRef.current();
        }
      }, INTRO_TIMING.revealStartDelay * 1000)
    );

    // Full intro settle at 4.6s: release interaction lock cleanly
    timers.push(
      setTimeout(() => {
        if (!cancelledRef.current && !finishedRef.current) {
          finishedRef.current = true;
          onCompleteRef.current();
        }
      }, INTRO_TIMING.totalIntroDurationMs)
    );

    // Drive Phase A + Phase B transform/opacity timeline at 60fps
    const runTimeline = async () => {
      try {
        // Phase A.1: Mascot smooth ease-out pop-in (scale 0.85 -> 1 + fade, no overshoot/wobble)
        animate(
          '[data-intro-mascot]',
          { opacity: 1, scale: 1 },
          {
            delay: INTRO_TIMING.popInDelay,
            duration: INTRO_TIMING.popInDuration,
            ease: INTRO_TIMING.popInEase,
          }
        );

        // Phase A.2: Right eye winks once into '<' chevron (120ms in, 350ms hold, 120ms out), mascot body still
        const winkInDelay = INTRO_TIMING.winkStart;
        const winkOutDelay =
          INTRO_TIMING.winkStart +
          INTRO_TIMING.winkTransitionDuration +
          INTRO_TIMING.winkHoldDuration;

        animate(
          '[data-mascot-right-oval]',
          { opacity: 0 },
          {
            delay: winkInDelay,
            duration: INTRO_TIMING.winkTransitionDuration,
            ease: INTRO_TIMING.winkEase,
          }
        );
        animate(
          '[data-mascot-right-chevron]',
          { opacity: 1 },
          {
            delay: winkInDelay,
            duration: INTRO_TIMING.winkTransitionDuration,
            ease: INTRO_TIMING.winkEase,
          }
        );

        animate(
          '[data-mascot-right-chevron]',
          { opacity: 0 },
          {
            delay: winkOutDelay,
            duration: INTRO_TIMING.winkTransitionDuration,
            ease: INTRO_TIMING.winkEase,
          }
        );
        animate(
          '[data-mascot-right-oval]',
          { opacity: 1 },
          {
            delay: winkOutDelay,
            duration: INTRO_TIMING.winkTransitionDuration,
            ease: INTRO_TIMING.winkEase,
          }
        );

        // Phase B (2.0s): Red background card rounds corners, tilts CCW, and drops off screen
        animate(
          '[data-intro-red-sheet]',
          {
            borderRadius: '40px',
          },
          {
            delay: INTRO_TIMING.fallStart,
            duration: INTRO_TIMING.sheetCornerDuration,
            ease: 'easeOut',
          }
        );

        animate(
          '[data-intro-red-sheet]',
          {
            y: '118vh',
            rotate: INTRO_TIMING.sheetFallRotateDeg,
          },
          {
            delay: INTRO_TIMING.fallStart,
            duration: INTRO_TIMING.sheetFallDuration,
            ease: INTRO_TIMING.fallEase,
          }
        );

        // Phase B (2.0s): Mascot tilts CW and falls slightly faster ahead of the red card
        animate(
          '[data-intro-mascot]',
          {
            y: '126vh',
            rotate: INTRO_TIMING.mascotFallRotateDeg,
          },
          {
            delay: INTRO_TIMING.fallStart,
            duration: INTRO_TIMING.mascotFallDuration,
            ease: INTRO_TIMING.fallEase,
          }
        );
      } catch {
        // Animation cancelled on unmount/skip
      }
    };

    runTimeline();

    return () => {
      cancelledRef.current = true;
      timers.forEach(clearTimeout);
    };
  }, [active, animate, scope]);

  const handleTapToSkip = async () => {
    if (!canSkip || finishedRef.current) return;
    finishedRef.current = true;
    cancelledRef.current = true;

    onPhaseBStartRef.current?.();
    onSkipRef.current();

    if (scope.current) {
      try {
        await animate(
          scope.current,
          { opacity: 0 },
          { duration: INTRO_TIMING.skipFadeDuration, ease: 'easeOut' }
        );
      } catch {
        // Ignore
      }
    }
    onCompleteRef.current();
  };

  if (!active) return null;

  return (
    <div
      ref={scope}
      onClick={handleTapToSkip}
      role="presentation"
      className="pointer-events-auto absolute inset-0 z-50 overflow-hidden select-none"
    >
      {/* Full-screen Red Sheet (edge-to-edge in Phase A, rounds to 40px & tilts CCW in Phase B) */}
      <motion.div
        data-intro-red-sheet
        initial={{ y: 0, rotate: 0, borderRadius: '0px' }}
        style={{
          backgroundColor: INTRO_TIMING.redHex,
          transformOrigin: '50% 60%',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55), 0 -10px 32px rgba(0, 0, 0, 0.32)',
        }}
        className="absolute inset-0 will-change-transform"
      />

      {/* Centered Mascot SVG (45-55% screen width) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          data-intro-mascot
          initial={{ opacity: 0, scale: 0.85, y: 0, rotate: 0 }}
          className="w-[50%] max-w-[225px] min-w-[165px] will-change-transform"
        >
          {/* Original Character Mascot SVG — #1A1A1A body with top-center notch & #E2E2E2 oval eyes */}
          <svg
            viewBox="0 0 400 440"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-auto w-full overflow-visible"
            aria-hidden="true"
          >
            {/* Twin-lobe black rounded silhouette with pointed top-center notch */}
            <path
              d="M 32 344
                 L 32 232
                 C 32 104, 72 28, 134 28
                 C 168 28, 188 58, 200 94
                 C 212 58, 232 28, 266 28
                 C 328 28, 368 104, 368 232
                 L 368 344
                 C 368 394, 330 420, 272 420
                 L 128 420
                 C 70 420, 32 394, 32 344 Z"
              fill="#1A1A1A"
            />

            {/* Left eye: stays centered oval the entire time */}
            <ellipse cx="164" cy="186" rx="22" ry="44" fill="#E2E2E2" />

            {/* Right eye: crossfades smoothly from centered oval to '<' chevron and back */}
            <g>
              <motion.ellipse
                data-mascot-right-oval
                initial={{ opacity: 1 }}
                cx="238"
                cy="183"
                rx="22"
                ry="44"
                fill="#E2E2E2"
              />
              <motion.path
                data-mascot-right-chevron
                initial={{ opacity: 0 }}
                d="M 251 153 L 225 183 L 251 213"
                stroke="#E2E2E2"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
