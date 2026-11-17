import { useMemo } from 'react';
import { motion } from 'motion/react';
import { INTRO_TIMING, IntroStage } from './IntroSequence';

interface StarburstRay {
  angleDeg: number;
  length: number;
  halfSpreadDeg: number;
}

const TOP_RIGHT_RAYS: StarburstRay[] = [
  { angleDeg: 8, length: 240, halfSpreadDeg: 4.5 },
  { angleDeg: 27, length: 165, halfSpreadDeg: 3.8 },
  { angleDeg: 45, length: 280, halfSpreadDeg: 4.8 },
  { angleDeg: 67, length: 190, halfSpreadDeg: 4.1 },
  { angleDeg: 88, length: 300, halfSpreadDeg: 5.0 },
  { angleDeg: 112, length: 215, halfSpreadDeg: 4.0 },
  { angleDeg: 132, length: 335, halfSpreadDeg: 4.6 },
  { angleDeg: 155, length: 235, halfSpreadDeg: 4.2 },
  { angleDeg: 176, length: 365, halfSpreadDeg: 4.9 },
  { angleDeg: 198, length: 255, halfSpreadDeg: 4.0 },
  { angleDeg: 219, length: 345, halfSpreadDeg: 4.5 },
  { angleDeg: 242, length: 205, halfSpreadDeg: 4.3 },
  { angleDeg: 263, length: 295, halfSpreadDeg: 4.7 },
  { angleDeg: 286, length: 175, halfSpreadDeg: 3.9 },
  { angleDeg: 309, length: 265, halfSpreadDeg: 4.4 },
  { angleDeg: 331, length: 155, halfSpreadDeg: 3.7 },
  { angleDeg: 351, length: 230, halfSpreadDeg: 4.1 },
];

const BOTTOM_LEFT_RAYS: StarburstRay[] = [
  { angleDeg: 12, length: 260, halfSpreadDeg: 4.7 },
  { angleDeg: 34, length: 180, halfSpreadDeg: 4.0 },
  { angleDeg: 56, length: 315, halfSpreadDeg: 4.9 },
  { angleDeg: 79, length: 205, halfSpreadDeg: 4.1 },
  { angleDeg: 102, length: 275, halfSpreadDeg: 4.5 },
  { angleDeg: 126, length: 165, halfSpreadDeg: 3.8 },
  { angleDeg: 149, length: 245, halfSpreadDeg: 4.4 },
  { angleDeg: 174, length: 190, halfSpreadDeg: 4.0 },
  { angleDeg: 198, length: 290, halfSpreadDeg: 4.6 },
  { angleDeg: 222, length: 175, halfSpreadDeg: 3.9 },
  { angleDeg: 246, length: 260, halfSpreadDeg: 4.4 },
  { angleDeg: 271, length: 310, halfSpreadDeg: 4.8 },
  { angleDeg: 294, length: 215, halfSpreadDeg: 4.2 },
  { angleDeg: 318, length: 330, halfSpreadDeg: 4.7 },
  { angleDeg: 342, length: 195, halfSpreadDeg: 4.0 },
];

function buildStarburstPath(cx: number, cy: number, innerRadius: number, rays: StarburstRay[]) {
  return rays
    .map((ray) => {
      const a1 = ((ray.angleDeg - ray.halfSpreadDeg) * Math.PI) / 180;
      const aMid = (ray.angleDeg * Math.PI) / 180;
      const a2 = ((ray.angleDeg + ray.halfSpreadDeg) * Math.PI) / 180;

      const x1 = cx + Math.cos(a1) * innerRadius;
      const y1 = cy + Math.sin(a1) * innerRadius;
      const xTip = cx + Math.cos(aMid) * ray.length;
      const yTip = cy + Math.sin(aMid) * ray.length;
      const x2 = cx + Math.cos(a2) * innerRadius;
      const y2 = cy + Math.sin(a2) * innerRadius;

      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${xTip.toFixed(1)} ${yTip.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    })
    .join(' ');
}

export function AppBackground({ introStage = 'settled' }: { introStage?: IntroStage }) {
  const topRightPath = useMemo(() => buildStarburstPath(335, 195, 58, TOP_RIGHT_RAYS), []);
  const bottomLeftPath = useMemo(() => buildStarburstPath(58, 760, 52, BOTTOM_LEFT_RAYS), []);

  const bgVisible = introStage !== 'hidden';

  return (
    <motion.div
      aria-hidden="true"
      initial={introStage === 'hidden' ? { opacity: 0 } : false}
      animate={{ opacity: bgVisible ? 1 : 0 }}
      transition={
        introStage === 'reveal'
          ? {
              duration: INTRO_TIMING.home.backgroundDuration,
              delay: INTRO_TIMING.home.backgroundDelay,
              ease: INTRO_TIMING.home.ease,
            }
          : { duration: INTRO_TIMING.skipFadeDuration, ease: 'easeOut' }
      }
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#05060D]"
    >
      {/* Base Vertical Navy Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(170deg, #070811 0%, #05060D 42%, #0B0B18 100%)',
        }}
      />

      {/* Faint Deep Purple / Magenta Glow at Lower Left */}
      <div
        className="absolute -bottom-24 -left-24 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(108, 42, 128, 0.34) 0%, rgba(68, 24, 88, 0.16) 48%, rgba(5, 6, 13, 0) 75%)',
        }}
      />

      {/* Dark Indigo / Blue Tint Toward Right & Bottom */}
      <div
        className="absolute top-[18%] -right-24 h-[460px] w-[420px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(28, 34, 92, 0.34) 0%, rgba(16, 22, 62, 0.16) 52%, rgba(5, 6, 13, 0) 76%)',
        }}
      />

      {/* Subtle Blended Teal Hint at Top Right (homage to Home glow) */}
      <div
        className="absolute -top-16 -right-14 h-64 w-64 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(22, 108, 118, 0.18) 0%, rgba(16, 62, 74, 0.08) 55%, rgba(5, 6, 13, 0) 78%)',
        }}
      />

      {/* Dark Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(5, 6, 13, 0) 45%, rgba(2, 3, 7, 0.65) 100%)',
        }}
      />

      {/* Decorative Hairline Starbursts (inline SVG, 1px lavender-grey lines) */}
      <svg
        viewBox="0 0 420 860"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <g
          className="animate-starburst-slow"
          style={{ transformOrigin: '335px 195px' }}
        >
          <path
            d={topRightPath}
            stroke="rgba(216, 214, 242, 0.18)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        <g
          className="animate-starburst-reverse"
          style={{ transformOrigin: '58px 760px' }}
        >
          <path
            d={bottomLeftPath}
            stroke="rgba(216, 214, 242, 0.17)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </motion.div>
  );
}
