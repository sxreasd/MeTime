/**
 * Shared soft, relaxed, GPU-only motion tokens.
 * Enforces gentle ease-in-out / low-stiffness springs with zero bounce/overshoot.
 */

export const SOFT_EASE = [0.4, 0, 0.2, 1] as const;
export const DECEL_EASE = [0.22, 1, 0.36, 1] as const;

export const SOFT_SPRING = {
  type: 'spring' as const,
  stiffness: 145,
  damping: 24,
  mass: 1,
};

export const GENTLE_DRAG_SPRING = {
  type: 'spring' as const,
  stiffness: 135,
  damping: 24,
  mass: 1,
};

export const SOFT_PILL_SPRING = {
  type: 'spring' as const,
  stiffness: 160,
  damping: 24,
  mass: 1,
};

export const SOFT_TAP = { scale: 0.98 } as const;
export const SOFT_TAP_TRANSITION = {
  duration: 0.2,
  ease: SOFT_EASE,
} as const;

export const SMALL_DURATION = 0.28;
export const SHEET_DURATION = 0.48;
export const PAGE_DURATION = 0.5;
