import React, { useState, useEffect } from 'react';
import { MetricScores, MetricID } from '../types';

interface RadarChartProps {
  scores: MetricScores;
  size?: number;
  /** Show target line at 0.66 (medium threshold) */
  showTarget?: boolean;
}

const getResponsiveSize = (preferred: number) => {
  if (typeof window === 'undefined') return preferred;
  return Math.min(preferred, window.innerWidth - 48);
};

const METRICS_ORDER: MetricID[] = [
  "Dependency_Index",
  "Cognitive_Load",
  "Process_Standardization",
  "Knowledge_Asset_Value",
  "Strategic_Maturity"
];

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: 'תלות',
  Cognitive_Load: 'עומס',
  Process_Standardization: 'תהליכים',
  Knowledge_Asset_Value: 'ידע',
  Strategic_Maturity: 'אסטרטגיה'
};

export const RadarChart: React.FC<RadarChartProps> = ({ scores, size = 300, showTarget = true }) => {
  const [responsiveSize, setResponsiveSize] = useState(() => getResponsiveSize(size));

  useEffect(() => {
    const update = () => setResponsiveSize(getResponsiveSize(size));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [size]);

  const chartSize = responsiveSize;
  const center = chartSize / 2;
  const radius = (chartSize / 2) - 40;
  const angleStep = (Math.PI * 2) / 5;

  const getCoordinates = (value: number, index: number) => {
    const finalAngle = index * angleStep - (Math.PI / 2);

    return {
      x: center + (radius * value) * Math.cos(finalAngle),
      y: center + (radius * value) * Math.sin(finalAngle)
    };
  };

  // Generate polygon points
  const points = METRICS_ORDER.map((metric, i) => {
    const value = scores[metric] || 0.1; // Min value for visibility
    const coords = getCoordinates(value, i);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const TARGET_LEVEL = 0.66;
  const targetPoints = METRICS_ORDER.map((_, i) => {
    const { x, y } = getCoordinates(TARGET_LEVEL, i);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative" style={{ direction: 'ltr' }}>
      <svg width={chartSize} height={chartSize} className="overflow-visible">
        {levels.map((level, lvlIdx) => (
          <polygon
            key={level}
            points={METRICS_ORDER.map((_, i) => {
              const { x, y } = getCoordinates(level, i);
              return `${x},${y}`;
            }).join(' ')}
            fill={lvlIdx === levels.length - 1 ? 'var(--qa-bg)' : 'none'}
            stroke="var(--qa-border)"
            strokeWidth="1"
            strokeDasharray={lvlIdx < levels.length - 1 ? '3 3' : ''}
          />
        ))}

        {METRICS_ORDER.map((metric, i) => {
          const start = getCoordinates(0, i);
          const end = getCoordinates(1, i);
          return (
            <g key={metric}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="var(--qa-border)" strokeWidth="1" />
              <text
                x={end.x}
                y={end.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] sm:text-[10px] fill-[var(--qa-text-secondary)] font-normal"
                transform={`translate(${Math.cos(i * angleStep - Math.PI / 2) * 20}, ${Math.sin(i * angleStep - Math.PI / 2) * 15})`}
              >
                {METRIC_LABELS[metric]}
              </text>
            </g>
          );
        })}

        {showTarget && (
          <polygon
            points={targetPoints}
            fill="none"
            stroke="var(--report-gap)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
        )}
        <polygon
          points={points}
          fill="var(--qa-accent-soft)"
          stroke="var(--qa-accent)"
          strokeWidth="1.5"
        />

        {METRICS_ORDER.map((metric, i) => {
          const { x, y } = getCoordinates(scores[metric] || 0.1, i);
          return (
            <circle
              key={metric}
              cx={x}
              cy={y}
              r="3.5"
              fill="var(--qa-accent)"
              stroke="var(--qa-surface)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      <p className="text-xs text-[var(--qa-text-muted)] mt-2 text-center" style={{ direction: 'rtl' }}>
        סולם 0–1 (גבוה = פער גדול יותר) | קו מקווקו = יעד בינוני
      </p>
    </div>
  );
};