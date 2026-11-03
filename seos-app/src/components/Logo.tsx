import { useId } from 'react';

/**
 * SEOS mark — a surveyed block of ground.
 *
 * Top face: topographic contours climbing to a terracotta summit (the idea).
 * Front faces: four strata of uneven thickness (sandstone, ochre, clay,
 * basalt) — the layers every project is built from. Left face is lit,
 * right face is in shade.
 *
 * `tone` is the background the mark sits on: on dark grounds the basalt
 * layers are lifted so the silhouette doesn't dissolve.
 * Keep in sync with public/favicon.svg.
 */

type Tone = 'light' | 'dark';

const LIT = ['#dcc398', '#c48c48', '#a4502b', '#3d322b'];
const SHADE = ['#bc9d6c', '#9d6a33', '#7f3c20', '#2a221d'];
const LIT_ON_DARK = ['#dcc398', '#c48c48', '#a4502b', '#5c4b3f'];
const SHADE_ON_DARK = ['#bc9d6c', '#9d6a33', '#7f3c20', '#463a31'];

const LEFT_BANDS = [
  'M7 19.5 L32 34 L32 39.5 Q19.5 36.75 7 25 Z',
  'M7 25 Q19.5 36.75 32 39.5 L32 46 Q19.5 34.75 7 31.5 Z',
  'M7 31.5 Q19.5 34.75 32 46 L32 52.5 Q19.5 48.75 7 38 Z',
  'M7 38 Q19.5 48.75 32 52.5 L32 60 L7 45.5 Z',
];

const RIGHT_BANDS = [
  'M32 34 L57 19.5 L57 25 Q44.5 28.25 32 39.5 Z',
  'M32 39.5 Q44.5 28.25 57 25 L57 31.5 Q44.5 43.25 32 46 Z',
  'M32 46 Q44.5 43.25 57 31.5 L57 38 Q44.5 41.75 32 52.5 Z',
  'M32 52.5 Q44.5 41.75 57 38 L57 45.5 L32 60 Z',
];

const TOP_FACE = 'M32 5 L57 19.5 L32 34 L7 19.5 Z';

// Contour rings drift toward the summit, like a real survey
const CONTOURS = [
  { cx: 29, cy: 20, rx: 23, ry: 11.5, rot: -6, color: '#d6bb8e' },
  { cx: 27.6, cy: 18.6, rx: 15, ry: 7.4, rot: -12, color: '#c9a576' },
  { cx: 26.6, cy: 17.6, rx: 8, ry: 4, rot: -18, color: '#b88a55' },
];
const SUMMIT = { cx: 26.1, cy: 17.1, rx: 2.9, ry: 1.7, rot: -18 };



export function LogoMark({ size = 28, tone = 'light', title }: { size?: number; tone?: Tone; title?: string }) {
  const lit = tone === 'dark' ? LIT_ON_DARK : LIT;
  const shade = tone === 'dark' ? SHADE_ON_DARK : SHADE;
  const clipId = `seos-top${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={TOP_FACE} />
        </clipPath>
      </defs>

      {/* strata */}
      {LEFT_BANDS.map((d, i) => <path key={`l${i}`} d={d} fill={lit[i]} />)}
      {RIGHT_BANDS.map((d, i) => <path key={`r${i}`} d={d} fill={shade[i]} />)}

      {/* surveyed surface */}
      <path d={TOP_FACE} fill="#f2e8d5" />
      <g clipPath={`url(#${clipId})`} fill="none" strokeWidth="1.25">
        {CONTOURS.map((c) => (
          <ellipse key={c.rx} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} stroke={c.color} transform={`rotate(${c.rot} ${c.cx} ${c.cy})`} />
        ))}
      </g>
      <ellipse
        cx={SUMMIT.cx} cy={SUMMIT.cy} rx={SUMMIT.rx} ry={SUMMIT.ry} fill="#a4502b"
        transform={`rotate(${SUMMIT.rot} ${SUMMIT.cx} ${SUMMIT.cy})`}
      />

      {/* edges */}
      <path d="M7 19.5 L32 34 L57 19.5" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.8" />
      <path d="M32 34 V60" stroke="#fff" strokeOpacity="0.12" strokeWidth="0.8" />
      {tone === 'light' && (
        <path d="M32 5 L57 19.5 V45.5 L32 60 L7 45.5 V19.5 Z" fill="none" stroke="#2a2420" strokeOpacity="0.14" strokeWidth="0.8" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function Logo({
  size = 28,
  tone = 'light',
  className = '',
  showWordmark = true,
}: {
  size?: number;
  tone?: Tone;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} tone={tone} title={showWordmark ? undefined : 'SEOS'} />
      {showWordmark && (
        <span className="font-display font-medium leading-none tracking-[-0.01em]" style={{ fontSize: size * 0.78 }}>
          SEOS
        </span>
      )}
    </span>
  );
}
