import { useEffect, useRef } from 'react';
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

export function SwipeableTransactionRow({
  tx,
  currency,
  hapticsEnabled,
  isRevealed,
  onRevealChange,
  onDelete,
  dotColor = '#10B981',
}: SwipeableTransactionRowProps) {
  // revealPx tracks how much of the Delete button is revealed on the right (0 .. DELETE_BTN_WIDTH)
  const revealPx = useMotionValue(0);
  const clampedWidth = useTransform(revealPx, (v) => Math.max(0, v));
  const rowBg = useTransform(revealPx, [0, DELETE_BTN_WIDTH], ['#FFFFFF', '#FEF2F2']);
  const borderColor = useTransform(revealPx, [0, DELETE_BTN_WIDTH], ['#F1F5F9', '#FECACA']);
  const deleteOpacity = useTransform(revealPx, [12, 52], [0, 1]);
  const deleteScale = useTransform(revealPx, [12, DELETE_BTN_WIDTH], [0.88, 1]);

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
    // Only close another open row once user clearly drags horizontally left
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
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="overflow-hidden px-4 py-1"
    >
      <motion.div
        style={{ borderColor }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onClick={() => {
          if (isRevealed) onRevealChange(null);
        }}
        className="flex cursor-grab touch-pan-y items-stretch overflow-hidden rounded-[16px] border select-none active:cursor-grabbing"
      >
        {/* Content area shrinks/reflows proportionally instead of sliding off-screen */}
        <motion.div
          style={{ backgroundColor: rowBg }}
          className="flex min-w-0 flex-1 items-center justify-between gap-2.5 px-3.5 py-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
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

          <span
            className={`shrink-0 text-[15px] tabular-nums ${
              isPositive ? 'font-bold text-[#16A34A]' : 'font-semibold text-[#111827]'
            }`}
          >
            {formatTxRowAmount(tx, currency)}
          </span>
        </motion.div>

        {/* Right Delete slot grows dynamically so outer right corners match rounded-[16px] card */}
        <motion.div
          style={{ width: clampedWidth }}
          className="shrink-0 overflow-hidden bg-[#EF4444]"
        >
          <motion.button
            type="button"
            style={{ opacity: deleteOpacity, scale: deleteScale }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerFeedback(hapticsEnabled, 'confirm');
              onDelete(tx.id);
            }}
            className="flex h-full w-[90px] items-center justify-center whitespace-nowrap text-[13px] font-semibold tracking-tight text-white active:bg-[#DC2626]"
          >
            Delete
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
