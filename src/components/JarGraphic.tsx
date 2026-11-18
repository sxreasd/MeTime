import { memo, useId } from 'react';
import { JAR_COLOR_STYLES, JarCircle, JarColorKey } from '../types/money';

/**
 * Shared jar silhouette geometry (viewBox 0..120 x 0..158):
 * Lid (top rounded pill), neck collar, and plump rounded jar body.
 */
const JAR_BODY_PATH =
  'M 28 24 L 92 24 C 106 26, 114 36, 114 52 L 114 134 C 114 149, 102 155, 84 155 L 36 155 C 18 155, 6 149, 6 134 L 6 52 C 6 36, 14 26, 28 24 Z';

/**
 * Small 3-color wave jar silhouette icon for Home's Savings Jar button.
 * Renders yellow (#FFE226), coral-pink (#F43F5E), and blue (#2563EB) flowing wave layers.
 */
export const JarMiniIcon = memo(function JarMiniIcon() {
  const uid = useId().replace(/:/g, '');
  const clipId = `jar-mini-${uid}`;

  return (
    <svg
      viewBox="0 0 120 158"
      className="h-12 w-10 shrink-0 overflow-visible"
      style={{ filter: 'drop-shadow(0 0 12px rgba(77, 171, 255, 0.44))' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={JAR_BODY_PATH} />
        </clipPath>
      </defs>

      {/* Lid + Neck */}
      <rect x="32" y="2" width="56" height="13" rx="6.5" fill="#FDE047" />
      <rect x="38" y="4.5" width="44" height="3.2" rx="1.6" fill="rgba(255,255,255,0.45)" />
      <rect x="39" y="15" width="42" height="10" rx="2.5" fill="#EAB308" />

      {/* 3-Color Gentle Flowing Wave Layers Clipped Inside Jar Body */}
      <g clipPath={`url(#${clipId})`}>
        {/* Top wave layer: Yellow */}
        <rect x="0" y="20" width="120" height="140" fill="#FFE226" />

        {/* Middle wave layer: Rose / Coral */}
        <path
          d="M -6 66 C 22 54, 48 76, 74 64 C 94 55, 110 60, 126 65 L 126 160 L -6 160 Z"
          fill="#F43F5E"
        />

        {/* Bottom wave layer: Blue */}
        <path
          d="M -6 94 C 26 106, 52 82, 82 94 C 102 102, 114 92, 126 90 L 126 160 L -6 160 Z"
          fill="#2563EB"
        />

        {/* Subtle vertical glass rim sheen */}
        <path
          d="M 16 62 L 16 124"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* Crisp subtle silhouette edge */}
      <path d={JAR_BODY_PATH} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
    </svg>
  );
});

interface JarCardWaveBackdropProps {
  color: JarColorKey;
  circles?: JarCircle[];
}

/**
 * Rounded-card wave + oversized randomized circles backdrop used inside
 * each rectangular Savings Jar card (clipped by the card's overflow-hidden).
 */
export const JarCardWaveBackdrop = memo(function JarCardWaveBackdrop({
  color,
  circles = [],
}: JarCardWaveBackdropProps) {
  const palette = JAR_COLOR_STYLES[color] || JAR_COLOR_STYLES.yellow;
  const isLightText = palette.text === '#FFFFFF';

  return (
    <>
      <svg
        viewBox="0 0 340 150"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {/* Base hue */}
        <rect x="0" y="0" width="340" height="150" fill={palette.waveLight} />

        {/* Flowing mid wave layer */}
        <path
          d="M -20 56 C 72 28, 178 88, 272 44 C 308 27, 336 38, 360 46 L 360 165 L -20 165 Z"
          fill={palette.waveMid}
        />

        {/* Flowing deep wave layer */}
        <path
          d="M -20 104 C 86 130, 188 76, 286 110 C 318 122, 342 104, 360 98 L 360 165 L -20 165 Z"
          fill={palette.waveDark}
        />

        {/* Oversized Persisted Random Circles (many extend beyond card edges, clipped by overflow-hidden) */}
        {circles.map((c, idx) => (
          <circle
            key={idx}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={c.tone === 'light' ? palette.circleLight : palette.circleDark}
            fillOpacity={c.opacity}
          />
        ))}
      </svg>

      {/* Subtle contrast scrim on dark-bg/white-text cards so numbers and labels stay crisp */}
      {isLightText && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black/[0.08]"
        />
      )}
    </>
  );
});
