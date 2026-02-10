import React from 'react';
import { MetricScores, MetricID } from '../types';

interface RadarChartProps {
  scores: MetricScores;
  size?: number;
}

const METRICS_ORDER: MetricID[] = [
  "Dependency_Index",
  "Cognitive_Load",
  "Process_Standardization",
  "Knowledge_Asset_Value",
  "Strategic_Maturity"
];

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: "תלות",
  Cognitive_Load: "עומס",
  Process_Standardization: "תהליכים",
  Knowledge_Asset_Value: "ידע",
  Strategic_Maturity: "אסטרטגיה"
};

export const RadarChart: React.FC<RadarChartProps> = ({ scores, size = 300 }) => {
  const center = size / 2;
  const radius = (size / 2) - 40; // Padding for labels
  const angleStep = (Math.PI * 2) / 5;

  // Helper to calculate coordinates
  const getCoordinates = (value: number, index: number) => {
    const angle = (Math.PI / 2) + (index * angleStep); // Start from top
    // Note: SVG y-axis is inverted (down is positive), but sin/cos standard is up.
    // We rotate -90deg (start top) which is -PI/2.
    // Actually, let's just do standard math:
    // x = r * cos(a), y = r * sin(a)
    // We want index 0 at top (-y). 
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
  }).join(" ");

  // Generate grid levels (0.2, 0.4, 0.6, 0.8, 1.0)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative" style={{ direction: 'ltr' }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grid */}
        {levels.map((level, lvlIdx) => (
          <polygon
            key={level}
            points={METRICS_ORDER.map((_, i) => {
              const { x, y } = getCoordinates(level, i);
              return `${x},${y}`;
            }).join(" ")}
            fill={lvlIdx === levels.length - 1 ? "#f8fafc" : "none"}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray={lvlIdx < levels.length - 1 ? "4 4" : ""}
          />
        ))}

        {/* Axes */}
        {METRICS_ORDER.map((metric, i) => {
          const start = getCoordinates(0, i);
          const end = getCoordinates(1, i);
          return (
            <g key={metric}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth="1" />
              {/* Labels */}
              <text
                x={end.x}
                y={end.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-slate-500 font-medium"
                transform={`translate(${Math.cos(i * angleStep - Math.PI / 2) * 20}, ${Math.sin(i * angleStep - Math.PI / 2) * 15})`}
              >
                {METRIC_LABELS[metric]}
              </text>
            </g>
          );
        })}

        {/* Data Polygon */}
        <polygon
          points={points}
          fill="rgba(147, 51, 234, 0.2)" // Purple-600 with opacity
          stroke="#9333ea"
          strokeWidth="2"
        />

        {/* Data Points */}
        {METRICS_ORDER.map((metric, i) => {
          const { x, y } = getCoordinates(scores[metric] || 0.1, i);
          return (
            <circle
              key={metric}
              cx={x}
              cy={y}
              r="4"
              fill="#9333ea"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
};