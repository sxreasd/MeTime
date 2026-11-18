import { memo, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { formatCurrency } from '../utils/format';
import { DECEL_EASE, SOFT_SPRING } from '../utils/motion';

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  className?: string;
  forceDecimals?: boolean;
  startFromZero?: boolean;
  holdAtZero?: boolean;
  countDelay?: number;
  countDuration?: number;
}

export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  currency = '₱',
  className = '',
  forceDecimals = false,
  startFromZero = false,
  holdAtZero = false,
  countDelay = 0,
  countDuration,
}: AnimatedNumberProps) {
  const initialVal = startFromZero || holdAtZero ? 0 : value;
  const motionVal = useMotionValue(initialVal);
  const [displayValue, setDisplayValue] = useState(initialVal);
  const lastCommittedRef = useRef(initialVal);
  const mountedRef = useRef(false);
  const prevHoldRef = useRef(holdAtZero);

  useEffect(() => {
    const commit = (next: number) => {
      const rounded = Math.round(next * 100) / 100;
      if (rounded !== lastCommittedRef.current) {
        lastCommittedRef.current = rounded;
        setDisplayValue(rounded);
      }
    };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (holdAtZero) {
      motionVal.set(0);
      commit(0);
      prevHoldRef.current = true;
      return;
    }

    const releasedFromHold = prevHoldRef.current && !holdAtZero;
    prevHoldRef.current = false;

    if (prefersReducedMotion) {
      mountedRef.current = true;
      motionVal.set(value);
      commit(value);
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      if ((startFromZero || releasedFromHold) && value !== 0) {
        motionVal.set(0);
      } else {
        motionVal.set(value);
        commit(value);
        return;
      }
    }

    const controls = animate(
      motionVal,
      value,
      countDuration && releasedFromHold
        ? {
            delay: countDelay,
            duration: countDuration,
            ease: DECEL_EASE,
            onUpdate: commit,
            onComplete: () => commit(value),
          }
        : {
            ...SOFT_SPRING,
            onUpdate: commit,
            onComplete: () => commit(value),
          }
    );
    return () => controls.stop();
  }, [value, motionVal, startFromZero, holdAtZero, countDelay, countDuration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {formatCurrency(displayValue, currency, { forceDecimals })}
    </span>
  );
});
