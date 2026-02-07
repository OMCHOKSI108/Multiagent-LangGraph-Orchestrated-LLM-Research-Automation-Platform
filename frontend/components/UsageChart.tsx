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
    <div className="w-full overflow-hidden border border-zinc-200 dark:border-dark-300 rounded-lg p-4 bg-white dark:bg-dark-primary">
        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Token Consumption (7 Days)</h4>
        <div className="relative h-[150px] w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" className="text-zinc-200 dark:text-dark-300" strokeWidth="1" />
                
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
                                className="fill-zinc-800 dark:fill-zinc-300 hover:fill-indigo-600 dark:hover:fill-indigo-400 transition-colors cursor-pointer"
                                rx="2"
                            />
                            <text 
                                x={x + barWidth / 2} 
                                y={height - 5} 
                                textAnchor="middle" 
                                className="text-[10px] fill-zinc-400 dark:fill-zinc-500 font-mono"
                            >
                                {d.date.split(' ')[0]}
                            </text>
                            
                            {/* Value Label on Hover */}
                            <text
                                x={x + barWidth / 2}
                                y={y - 5}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-zinc-900 dark:fill-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
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