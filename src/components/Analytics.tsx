import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useMoney } from '../context/MoneyContext';
import { AnalyticsPeriod } from '../types/money';
import { computeAnalytics, formatCurrency, triggerFeedback } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { AppBackground } from './AppBackground';

interface AnalyticsProps {
  onBack: () => void;
  registerBackHandler?: (fn: (() => boolean) | null) => void;
}

/** Smooth Catmull-Rom to Cubic Bezier SVG path builder */
function buildSmoothSpline(coords: { x: number; y: number }[]): {
  linePath: string;
  areaPath: string;
  baselineY: number;
} {
  if (coords.length === 0) return { linePath: '', areaPath: '', baselineY: 130 };
  const baselineY = 132;
  if (coords.length === 1) {
    const p = coords[0];
    return {
      linePath: `M ${p.x} ${p.y}`,
      areaPath: `M ${p.x} ${baselineY} L ${p.x} ${p.y} L ${p.x} ${baselineY} Z`,
      baselineY,
    };
  }

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPath = `${d} L ${last.x.toFixed(2)} ${baselineY} L ${first.x.toFixed(2)} ${baselineY} Z`;

  return { linePath: d, areaPath, baselineY };
}

export function Analytics({ onBack, registerBackHandler }: AnalyticsProps) {
  const {
    transactions,
    spendCategories,
    todaySpending,
    weekSpending,
    monthSpending,
    settings,
  } = useMoney();

  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showEmptyCats, setShowEmptyCats] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      return false;
    });
    return () => registerBackHandler(null);
  }, [menuOpen, registerBackHandler]);

  const svgRef = useRef<SVGSVGElement>(null);

  const snapshot = useMemo(
    () => computeAnalytics(transactions, period, spendCategories),
    [transactions, period, spendCategories]
  );

  // Sync default selected index when period changes
  useEffect(() => {
    setSelectedIndex(snapshot.defaultSelectedIndex);
  }, [period, snapshot.defaultSelectedIndex]);

  const safeIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, snapshot.points.length - 1));
  const activePoint = snapshot.points[safeIndex] || { label: '', value: 0, fullLabel: '' };

  // SVG Coordinate Space: width 340, height 150
  const svgWidth = 340;
  const padX = 14;
  const topY = 44;
  const bottomY = 122;

  const coords = useMemo(() => {
    const pts = snapshot.points;
    if (pts.length === 0) return [];
    const maxVal = Math.max(...pts.map((p) => p.value), 0);
    const spanX = svgWidth - padX * 2;
    return pts.map((p, i) => {
      const x = pts.length === 1 ? svgWidth / 2 : padX + (i / (pts.length - 1)) * spanX;
      const ratio = maxVal > 0 ? p.value / maxVal : 0;
      const y = maxVal > 0 ? bottomY - ratio * (bottomY - topY) : bottomY - 4;
      return { x, y };
    });
  }, [snapshot.points]);

  const { linePath, areaPath, baselineY } = useMemo(() => buildSmoothSpline(coords), [coords]);
  const activeCoord = coords[safeIndex] || { x: svgWidth / 2, y: bottomY - 4 };

  const handleScrub = (clientX: number) => {
    if (!svgRef.current || snapshot.points.length <= 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * svgWidth;
    const clamped = Math.min(Math.max(relX, padX), svgWidth - padX);
    const ratio = (clamped - padX) / (svgWidth - padX * 2);
    const idx = Math.round(ratio * (snapshot.points.length - 1));
    if (idx !== safeIndex) {
      setSelectedIndex(idx);
    }
  };

  const isLowerOrEqual = snapshot.deltaPercent <= 0;
  const absDelta = Math.abs(Math.round(snapshot.deltaPercent * 10) / 10);

  const visibleBreakdown = useMemo(() => {
    if (showEmptyCats) return snapshot.breakdown;
    const nonZero = snapshot.breakdown.filter((b) => b.amount > 0);
    return nonZero.length > 0 ? nonZero : snapshot.breakdown;
  }, [snapshot.breakdown, showEmptyCats]);

  // Helper to decide which x-axis labels show on Month view so 30 days don't collide
  const shouldShowXLabel = (idx: number, total: number) => {
    if (period !== 'month') return true;
    if (idx === safeIndex) return true;
    if (idx === 0 || idx === total - 1) return true;
    return (idx + 1) % 5 === 0 && Math.abs(idx - safeIndex) > 1;
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#05060D] text-white">
      <AppBackground />

      {/* Header */}
      <header
        style={{ paddingTop: 'max(1.35rem, env(safe-area-inset-top))' }}
        className="relative z-20 flex items-center justify-between px-6 pb-3"
      >
        <button
          type="button"
          aria-label="Back to Home"
          onClick={() => {
            triggerFeedback(settings.hapticsEnabled, 'tap');
            onBack();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-[#1C2124]/85 text-white transition-transform hover:bg-[#242A2E] active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="text-[17px] font-semibold tracking-tight text-white">Analytics</h1>

        <div className="relative">
          <button
            type="button"
            aria-label="Analytics options"
            onClick={() => {
              triggerFeedback(settings.hapticsEnabled, 'tap');
              setMenuOpen((o) => !o);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-[#1C2124]/85 text-white transition-transform hover:bg-[#242A2E] active:scale-95"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                className="absolute right-0 top-13 z-30 w-52 rounded-2xl border border-white/10 bg-[#1A1D21] p-1.5 shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEmptyCats((v) => !v);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] text-[#C8CFD5] hover:bg-white/5"
                >
                  <span>{showEmptyCats ? 'Hide ₱ 0 categories' : 'Show all categories'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Scrollable Analytics Body */}
      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-6 pb-8">
        {/* Segmented Period Control: Today | Week | Month */}
        <div className="mt-2 flex justify-center">
          <div className="inline-flex rounded-full border border-white/[0.06] bg-[#1A1D21] p-1">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' },
              ] as const
            ).map((tab) => {
              const active = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerFeedback(settings.hapticsEnabled, 'tap');
                    setPeriod(tab.id);
                  }}
                  className={`relative min-h-[34px] rounded-full px-5 py-1 text-[13px] transition-colors ${
                    active ? 'font-semibold text-[#0B0F10]' : 'font-medium text-[#8E959B] hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="analytics-period-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-white"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Total Spending + Comparison Badge */}
        <div className="mt-5">
          <p className="text-[13px] font-medium text-[#8E959B]">Total Spending</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <AnimatedNumber
              value={snapshot.total}
              currency={settings.currency}
              className="text-[34px] leading-none font-bold tracking-tight text-white"
            />

            <div
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold tabular-nums ${
                isLowerOrEqual
                  ? 'bg-[#10B981]/15 text-[#4ADE80]'
                  : 'bg-[#F43F5E]/15 text-[#FB7185]'
              }`}
            >
              {isLowerOrEqual ? (
                <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
              )}
              <span>{absDelta}% vs last</span>
            </div>
          </div>
        </div>

        {/* Smooth Interactive Area Chart */}
        <div className="mt-4 select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} 154`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleScrub(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === 'touch') {
                handleScrub(e.clientX);
              }
            }}
            className="h-[168px] w-full touch-pan-y cursor-crosshair overflow-visible"
          >
            <defs>
              <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B7CF6" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#8B7CF6" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="activeColGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.06" />
                <stop offset="50%" stopColor="#6EEFA2" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#6EEFA2" stopOpacity="0.04" />
              </linearGradient>
              <filter id="dotGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Dashed Gridlines */}
            {[54, 86, 118].map((gy) => (
              <line
                key={gy}
                x1={padX}
                y1={gy}
                x2={svgWidth - padX}
                y2={gy}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
            ))}

            {/* Highlighted Vertical Band */}
            <motion.rect
              animate={{ x: activeCoord.x - 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              y={36}
              width={32}
              height={baselineY - 36}
              rx={10}
              fill="url(#activeColGrad)"
            />

            {/* Area Fill & Spline Stroke */}
            {areaPath && <path d={areaPath} fill="url(#purpleAreaGrad)" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#8B7CF6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Active Glowing Point */}
            <motion.g
              animate={{ x: activeCoord.x, y: activeCoord.y }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <circle r="9" fill="#4ADE80" fillOpacity="0.22" />
              <circle r="4.5" fill="#FFFFFF" stroke="#4ADE80" strokeWidth="2.2" filter="url(#dotGlow)" />
            </motion.g>

            {/* Green Tooltip Bubble */}
            {(() => {
              const labelText = formatCurrency(activePoint.value, settings.currency);
              const pillWidth = Math.max(66, labelText.length * 8.2 + 22);
              const clampedCenter = Math.min(
                Math.max(activeCoord.x, pillWidth / 2 + 4),
                svgWidth - pillWidth / 2 - 4
              );
              const bubbleY = Math.max(4, activeCoord.y - 42);
              const pointerOffset = activeCoord.x - clampedCenter;

              return (
                <motion.g
                  animate={{ x: clampedCenter, y: bubbleY }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                >
                  <rect
                    x={-pillWidth / 2}
                    y={0}
                    width={pillWidth}
                    height={26}
                    rx={13}
                    fill="#5EEB8D"
                  />
                  <polygon
                    points={`${pointerOffset - 5},25 ${pointerOffset + 5},25 ${pointerOffset},31`}
                    fill="#5EEB8D"
                  />
                  <text
                    x={0}
                    y={17}
                    textAnchor="middle"
                    fill="#0B0F10"
                    fontSize="12"
                    fontWeight="700"
                    className="tabular-nums"
                  >
                    {labelText}
                  </text>
                </motion.g>
              );
            })()}

            {/* X-Axis Labels */}
            {snapshot.points.map((pt, idx) => {
              if (!shouldShowXLabel(idx, snapshot.points.length)) return null;
              const xPos = coords[idx]?.x ?? padX;
              const isActive = idx === safeIndex;
              return (
                <text
                  key={`${pt.label}-${idx}`}
                  x={xPos}
                  y={148}
                  textAnchor="middle"
                  fill={isActive ? '#4ADE80' : '#6B7280'}
                  fontSize="11"
                  fontWeight={isActive ? '700' : '500'}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedIndex(idx)}
                >
                  {pt.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Three Period Summary Cards: Today / This Week / This Month */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { id: 'today' as const, label: 'Today', value: todaySpending },
            { id: 'week' as const, label: 'This Week', value: weekSpending },
            { id: 'month' as const, label: 'This Month', value: monthSpending },
          ].map((card) => {
            const active = period === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  triggerFeedback(settings.hapticsEnabled, 'tap');
                  setPeriod(card.id);
                }}
                className={`rounded-[20px] border p-3.5 text-left transition-colors active:scale-[0.98] ${
                  active
                    ? 'border-white/20 bg-[#20252B]'
                    : 'border-white/[0.06] bg-[#1A1D21]/85 hover:bg-[#1F2328]'
                }`}
              >
                <span className="block truncate text-[11px] font-medium text-[#8E959B]">
                  {card.label}
                </span>
                <AnimatedNumber
                  value={card.value}
                  currency={settings.currency}
                  className="mt-1.5 block truncate text-[15px] font-bold text-white"
                />
              </button>
            );
          })}
        </div>

        {/* Where Your Money Goes — By Category */}
        <div className="mt-4 rounded-[24px] border border-white/[0.06] bg-[#1A1D21]/85 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight text-white">
              Where Your Money Goes
            </h2>
            <span className="text-[12px] font-medium text-[#8E959B]">By Category</span>
          </div>

          <div className="space-y-4">
            {visibleBreakdown.map((cat) => (
              <div key={cat.name}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate font-medium text-[#E5E7EB]">{cat.name}</span>
                  </div>
                  <div className="shrink-0 tabular-nums">
                    <span className="font-bold text-white">
                      {formatCurrency(cat.amount, settings.currency)}
                    </span>{' '}
                    <span className="text-[12px] text-[#8E959B]">({cat.percentage}%)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
