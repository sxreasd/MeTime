import { useEffect, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { formatCurrency } from '../utils/format';

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  className?: string;
  forceDecimals?: boolean;
}

export function AnimatedNumber({
  value,
  currency = '₱',
  className = '',
  forceDecimals = false,
}: AnimatedNumberProps) {
  const motionVal = useMotionValue(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      type: 'spring',
      stiffness: 260,
      damping: 28,
      mass: 0.8,
      onUpdate: (latest) => {
        // Snap cleanly to 2 decimal places during interpolation
        setDisplayValue(Math.round(latest * 100) / 100);
      },
      onComplete: () => {
        setDisplayValue(value);
      },
    });
    return () => controls.stop();
  }, [value, motionVal]);

  return (
    <span className={`tabular-nums ${className}`}>
      {formatCurrency(displayValue, currency, { forceDecimals })}
    </span>
  );
}
