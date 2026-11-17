import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { formatCurrency } from '../utils/format';

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

export function AnimatedNumber({
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
  const mountedRef = useRef(false);
  const prevHoldRef = useRef(holdAtZero);

  useEffect(() => {
    if (holdAtZero) {
      motionVal.set(0);
      setDisplayValue(0);
      prevHoldRef.current = true;
      return;
    }

    const releasedFromHold = prevHoldRef.current && !holdAtZero;
    prevHoldRef.current = false;

    if (!mountedRef.current) {
      mountedRef.current = true;
      if ((startFromZero || releasedFromHold) && value !== 0) {
        motionVal.set(0);
      } else {
        motionVal.set(value);
        setDisplayValue(value);
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
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (latest) => {
              setDisplayValue(Math.round(latest * 100) / 100);
            },
            onComplete: () => {
              setDisplayValue(value);
            },
          }
        : {
            type: 'spring',
            stiffness: 240,
            damping: 26,
            mass: 0.85,
            onUpdate: (latest) => {
              setDisplayValue(Math.round(latest * 100) / 100);
            },
            onComplete: () => {
              setDisplayValue(value);
            },
          }
    );
    return () => controls.stop();
  }, [value, motionVal, startFromZero, holdAtZero, countDelay, countDuration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {formatCurrency(displayValue, currency, { forceDecimals })}
    </span>
  );
}
