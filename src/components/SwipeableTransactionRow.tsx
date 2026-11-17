import { memo, useEffect, useRef } from 'react';
import { animate, motion, PanInfo, useMotionValue, useTransform } from 'motion/react';
import { Transaction } from '../types/money';
import { formatTimeShort, formatTxRowAmount, triggerFeedback } from '../utils/format';

interface SwipeableTransactionRowProps {
  tx: Transaction;
  currency: string;
  hapticsEnabled: boolean;
  isRevealed: boolean;
  onRevealChange: (id: string | null) => void;
  onDelete: (id: string) => void;
  dotColor?: string;
}

const DELETE_BTN_WIDTH = 90;

export const SwipeableTransactionRow = memo(function SwipeableTransactionRow({
  tx,
  currency,
  hapticsEnabled,
  isRevealed,
  onRevealChange,
  onDelete,
  dotColor = '#10B981',
}: SwipeableTransactionRowProps) {
  // Pure transform/opacity motion values — zero width/height layout reflow per frame
  const revealPx = useMotionValue(0);
  const tintOpacity = useTransform(revealPx, [0, DELETE_BTN_WIDTH], [0, 1]);
  const amountX = useTransform(revealPx, (v) => -Math.max(0, v));
  const deleteBtnX = useTransform(revealPx, (v) => DELETE_BTN_WIDTH - Math.max(0, v));
  const deleteOpacity = useTransform(revealPx, [12, 52], [0, 1]);

  const isDraggingRef = useRef(false);
  const panStartRevealRef = useRef(0);
  const closedOthersRef = useRef(false);

  // Sync external reveal/close state (e.g. another row opened, scrolled, or tapped away)
  useEffect(() => {
    if (isDraggingRef.current) return;
    const target = isRevealed ? DELETE_BTN_WIDTH : 0;
    const controls = animate(revealPx, target, {
      type: 'spring',
      stiffness: 440,
      damping: 36,
      mass: 0.75,
    });
    return () => controls.stop();
  }, [isRevealed, revealPx]);

  const handlePanStart = () => {
    isDraggingRef.current = true;
    panStartRevealRef.current = revealPx.get();
    closedOthersRef.current = false;
  };

  const handlePan = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!closedOthersRef.current && !isRevealed && info.offset.x < -8) {
      closedOthersRef.current = true;
      onRevealChange(null);
    }

    const raw = panStartRevealRef.current - info.offset.x;
    let next = raw;
    if (raw < 0) {
      next = 0;
    } else if (raw > DELETE_BTN_WIDTH) {
      next = DELETE_BTN_WIDTH + (raw - DELETE_BTN_WIDTH) * 0.14;
    }
    revealPx.set(next);
  };

  const handlePanEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDraggingRef.current = false;
    const current = revealPx.get();
    const shouldOpen =
      current >= DELETE_BTN_WIDTH * 0.46 || info.velocity.x <= -300;
    const target = shouldOpen ? DELETE_BTN_WIDTH : 0;

    animate(revealPx, target, {
      type: 'spring',
      stiffness: 440,
      damping: 36,
      mass: 0.75,
    });

    onRevealChange(shouldOpen ? tx.id : null);
  };

  const isPositive = tx.type === 'add' || tx.type === 'jar_withdraw';
  const primaryText = tx.note ? tx.note : tx.jarName ? `${tx.category} · ${tx.jarName}` : tx.category;

  const metaParts: string[] = [];
  if (tx.note) {
    metaParts.push(tx.category);
    if (tx.jarName) metaParts.push(tx.jarName);
  }
  metaParts.push(formatTimeShort(tx.createdAt));
  const metaText = metaParts.join(' · ');

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16, ease: 'easeOut' } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="px-4 py-1"
    >
      <motion.div
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onClick={() => {
          if (isRevealed) onRevealChange(null);
        }}
        className="relative flex cursor-grab touch-pan-y items-center justify-between gap-2.5 overflow-hidden rounded-[16px] border border-[#F1F5F9] bg-white px-3.5 py-3 select-none active:cursor-grabbing"
      >
        {/* Pure opacity tint & soft red border highlight while swiped */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: tintOpacity }}
          className="pointer-events-none absolute inset-0 rounded-[16px] border border-[#FECACA] bg-[#FEF2F2]"
        />

        {/* Stationary Left Details (always stay on screen) */}
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 break-words text-[15px] leading-snug font-medium text-[#111827]">
              {primaryText}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-gray-400">
              {metaText}
            </p>
          </div>
        </div>

        {/* Amount translates smoothly via GPU transform to stay clear of the sliding Delete button */}
        <motion.div
          style={{ x: amountX }}
          className="relative z-10 shrink-0 rounded-l-lg bg-white pl-2"
        >
          <motion.span
            aria-hidden="true"
            style={{ opacity: tintOpacity }}
            className="pointer-events-none absolute inset-0 rounded-l-lg bg-[#FEF2F2]"
          />
          <span
            className={`relative z-10 text-[15px] tabular-nums ${
              isPositive ? 'font-bold text-[#16A34A]' : 'font-semibold text-[#111827]'
            }`}
          >
            {formatTxRowAmount(tx, currency)}
          </span>
        </motion.div>

        {/* Delete Button slides in from right via pure transform: translateX */}
        <motion.button
          type="button"
          style={{ x: deleteBtnX, opacity: deleteOpacity }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerFeedback(hapticsEnabled, 'confirm');
            onDelete(tx.id);
          }}
          className="absolute inset-y-0 right-0 z-20 flex w-[90px] items-center justify-center bg-[#EF4444] text-[13px] font-semibold tracking-tight whitespace-nowrap text-white active:bg-[#DC2626]"
        >
          Delete
        </motion.button>
      </motion.div>
    </motion.div>
  );
});
