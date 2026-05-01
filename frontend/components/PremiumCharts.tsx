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

  const themeOptions = {
    backgroundColor: 'transparent',
    textStyle: {
      color: 'var(--text-muted)',
    },
    title: {
      textStyle: {
        color: 'var(--text-primary)',
      }
    },
    tooltip: {
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: {
        color: 'var(--text-secondary)'
      }
    }
  };

  const finalOption = {
    ...themeOptions,
    ...config,
  };

  return (
    <Card className="mb-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold italic" style={{ color: 'var(--text-primary)' }}>
          {title || "Automated Insight Visualization"}
        </CardTitle>
        {description && (
          <p className="text-[10px] leading-relaxed italic" style={{ color: 'var(--text-tertiary)' }}>
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ReactECharts 
            option={finalOption} 
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
