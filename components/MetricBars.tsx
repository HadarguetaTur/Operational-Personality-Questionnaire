import React from 'react';
import { MetricScores, MetricID } from '../types';
import { getRiskScore } from '../engine/scoring';

interface MetricBarsProps {
  scores: MetricScores;
}

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: "תלות במייסדת",
  Cognitive_Load: "עומס קוגניטיבי",
  Process_Standardization: "היעדר סטנדרטיזציה",
  Knowledge_Asset_Value: "סיכון נכסי ידע",
  Strategic_Maturity: "חוסר בשלות אסטרטגית"
};

export const MetricBars: React.FC<MetricBarsProps> = ({ scores }) => {
  return (
    <div className="space-y-4 w-full">
      {Object.entries(scores).map(([key, value]) => {
        const metricKey = key as MetricID;
        const displayValue = getRiskScore(metricKey, value as number) * 100;

        return (
          <div key={key} className="flex flex-col">
            <div className="flex justify-between text-sm mb-1 text-[var(--qa-text-secondary)] font-normal">
              <span>{METRIC_LABELS[metricKey]}</span>
              <span className="opacity-80">{Math.round(displayValue)}%</span>
            </div>
            <div className="w-full bg-[var(--qa-bg)] rounded-full h-2.5 border border-[var(--qa-border)]">
              <div
                className="h-2.5 rounded-full transition-all duration-700 ease-out bg-[var(--qa-accent)]"
                style={{ width: `${displayValue}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};