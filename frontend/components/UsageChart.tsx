import React from 'react';
import { UsageMetric } from '../types';

interface UsageChartProps {
  data: UsageMetric[];
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  if (!data.length) return null;

  const maxTokens = Math.max(...data.map(d => d.tokens)) * 1.1; // Add 10% buffer
  const height = 150;
  const width = 500;
  const padding = 20;
  const barWidth = (width - padding * 2) / data.length / 2;

  return (
    <div className="w-full overflow-hidden border border-gray-200 rounded-lg p-4 bg-white">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Token Consumption (7 Days)</h4>
        <div className="relative h-[150px] w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="1" />
                
                {data.map((d, i) => {
                    const barHeight = (d.tokens / maxTokens) * (height - padding * 2);
                    const x = padding + i * ((width - padding * 2) / data.length) + 20;
                    const y = height - padding - barHeight;
                    
                    return (
                        <g key={i} className="group">
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                className="fill-black/80 hover:fill-indigo-600 transition-colors cursor-pointer"
                                rx="2"
                            />
                            {/* Tooltip emulation via peer-hover or simpler text labels */}
                            <text 
                                x={x + barWidth / 2} 
                                y={height - 5} 
                                textAnchor="middle" 
                                className="text-[10px] fill-gray-400 font-mono"
                            >
                                {d.date.split(' ')[0]}
                            </text>
                            
                            {/* Value Label on Hover */}
                            <text
                                x={x + barWidth / 2}
                                y={y - 5}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-black opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {(d.tokens / 1000).toFixed(1)}k
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    </div>
  );
};