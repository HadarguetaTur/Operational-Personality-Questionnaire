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
        // Display Risk Score (higher bar = worse)
        const displayValue = getRiskScore(metricKey, value as number) * 100;
        
        let colorClass = "bg-green-500";
        if (displayValue > 33) colorClass = "bg-yellow-400";
        if (displayValue > 66) colorClass = "bg-red-500";

        return (
          <div key={key} className="flex flex-col">
            <div className="flex justify-between text-sm mb-1 text-gray-600 font-medium">
              <span>{METRIC_LABELS[metricKey]}</span>
              <span>{Math.round(displayValue)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${colorClass} h-3 rounded-full transition-all duration-1000 ease-out`} 
                style={{ width: `${displayValue}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};