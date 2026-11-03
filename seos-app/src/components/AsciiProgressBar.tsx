import React from 'react';

/**
 * Utility to generate literal ASCII character progress bar: [████████░░░░░░░░]
 */
export function getAsciiBarString(progress: number, length = 16): string {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const filledChars = Math.round((clamped / 100) * length);
  const emptyChars = Math.max(0, length - filledChars);
  return `[${'█'.repeat(filledChars)}${'░'.repeat(emptyChars)}]`;
}

interface AsciiProgressBarProps {
  progress: number;
  className?: string;
  height?: string;
  showAsciiString?: boolean;
  length?: number;
}

/**
 * Theme-Grounded Dot-Matrix Progress Bar
 * Styled in SEOS signature warm terracotta/orange with dot-matrix stippled track.
 */
export const AsciiProgressBar: React.FC<AsciiProgressBarProps> = ({
  progress,
  className = '',
  height = 'h-2.5',
  showAsciiString = false,
  length = 14,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      <div className={`w-full overflow-hidden rounded bg-seos-surface-2 border border-seos-border relative flex ${height}`}>
        {/* Subtle dot-matrix unfilled pattern in warm accent */}
        <div
          className="absolute inset-0 opacity-20 text-seos-accent"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '4px 4px',
          }}
        />
        {/* Warm Terracotta / Orangish filled bar */}
        <div
          className="h-full bg-seos-accent transition-all duration-500 relative z-10 rounded-sm"
          style={{ width: `${clamped}%` }}
        />
      </div>

      {showAsciiString && (
        <div className="font-mono text-[10px] text-seos-accent/90 tracking-wider flex justify-between items-center">
          <span>{getAsciiBarString(clamped, length)}</span>
          <span className="font-bold text-seos-accent">{clamped}%</span>
        </div>
      )}
    </div>
  );
};

interface SimpleMasteryBarProps {
  progress: number;
  completedCount: number;
  totalCount?: number;
  className?: string;
}

/**
 * Decluttered Horizontal Mastery Progress Widget
 * Clean, lightweight, and matching the website's terracotta/limestone palette.
 */
export const SimpleMasteryBar: React.FC<SimpleMasteryBarProps> = ({
  progress,
  completedCount,
  totalCount = 6,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      className={`px-4 py-3 rounded-xl bg-seos-surface border border-seos-border shadow-xs flex flex-col justify-center ${className}`}
    >
      <div className="flex items-center justify-between font-mono text-xs mb-1.5">
        <span className="font-bold uppercase tracking-wider text-seos-text">Mastery Progress</span>
        <span className="font-bold text-seos-accent text-sm">{clamped}%</span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-3 rounded bg-seos-surface-2 border border-seos-border overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-25 text-seos-accent"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '4px 4px',
          }}
        />
        <div
          className="h-full bg-seos-accent transition-all duration-500 rounded-sm"
          style={{ width: `${clamped}%` }}
        />
      </div>

      <div className="flex justify-between items-center font-mono text-[11px] text-seos-text-3 mt-1.5">
        <span>{completedCount}/{totalCount} STAGES SETTLED</span>
        <span className="text-seos-accent font-semibold">{getAsciiBarString(clamped, 12)}</span>
      </div>
    </div>
  );
};

export default AsciiProgressBar;
