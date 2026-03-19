'use client';

import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PremiumChartsProps {
  config: any;
  title?: string;
  description?: string;
}

export default function PremiumCharts({ config, title, description }: PremiumChartsProps) {
  if (!config) return null;

  // Default theme options for a premium dark look
  const themeOptions = {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#cbd5e1', // slate-300
    },
    title: {
      textStyle: {
        color: '#f8fafc', // slate-50
      }
    },
    tooltip: {
      backgroundColor: '#0f172a', // slate-900
      borderColor: '#334155', // slate-700
      textStyle: {
        color: '#f1f2f4'
      }
    }
  };

  const finalOption = {
    ...themeOptions,
    ...config,
  };

  return (
    <Card className="bg-slate-950/60 border-slate-800/80 mb-6 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-100 italic">
          {title || "AI Insight Visualization"}
        </CardTitle>
        {description && (
          <p className="text-[10px] text-slate-400 leading-relaxed italic">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ReactECharts 
            option={finalOption} 
            style={{ height: '100%', width: '100%' }}
            theme="dark"
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
