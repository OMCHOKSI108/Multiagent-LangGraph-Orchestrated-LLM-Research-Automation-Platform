import React, { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import {
  FileText, BookOpen, Link2, Image, ExternalLink,
  Globe, Newspaper, Database, GraduationCap, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';

type TabKey = 'surveys' | 'literature' | 'links' | 'images';

interface ResourceTabsProps {
  images?: string[];
  diagrams?: string[];
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground/50">
      {icon}
    </div>
    <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
    <p className="text-xs text-muted-foreground/70">{description}</p>
  </div>
);

export const ResourceTabs: React.FC<ResourceTabsProps> = ({ images = [], diagrams = [] }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('links');

  const { dataSources } = useResearchStore(useShallow(state => ({
    dataSources: state.dataSources,
  })));

  // Categorize sources by actual backend source_type values:
  // 'web' (DuckDuckGo, Google, Wikipedia), 'arxiv', 'openalex', 'pubmed', 'news'
  const literature = dataSources.filter(s => {
    const t = (s.source_type || '').toLowerCase();
    return ['arxiv', 'pubmed', 'openalex', 'scholar', 'literature'].includes(t);
  });
  const newsLinks = dataSources.filter(s => {
    const t = (s.source_type || '').toLowerCase();
    return t === 'news';
  });
  const webLinks = dataSources.filter(s => {
    const t = (s.source_type || '').toLowerCase();
    return t === 'web';
  });

  // Fallback: any uncategorized sources go to web links
  const categorized = new Set([...literature, ...newsLinks, ...webLinks]);
  const uncategorized = dataSources.filter(s => !categorized.has(s));
  const allLinks = [...webLinks, ...newsLinks, ...uncategorized];

  // Surveys = datasets (kept for future use)
  const surveys = dataSources.filter(s => {
    const t = (s.source_type || '').toLowerCase();
    return ['dataset', 'kaggle', 'github'].includes(t);
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'links', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" />, count: allLinks.length },
    { key: 'literature', label: 'Literature', icon: <BookOpen className="w-3.5 h-3.5" />, count: literature.length },
    { key: 'surveys', label: 'Surveys', icon: <FileText className="w-3.5 h-3.5" />, count: surveys.length },
    { key: 'images', label: 'Images', icon: <Image className="w-3.5 h-3.5" />, count: images.length + diagrams.length },
  ];

  const renderSourceList = (items: any[], emptyIcon: React.ReactNode, emptyTitle: string, emptyDesc: string) => {
    if (items.length === 0) {
      return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />;
    }

    return (
      <div className="divide-y divide-border/50">
        {items.map((item, idx) => (
          <a
            key={`${item.url || item.domain}-${idx}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors group"
          >
            {/* Favicon */}
            <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
              {item.domain ? (
                <img
                  src={item.favicon || getFaviconUrl(item.domain)}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Globe className="w-3 h-3 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-foreground truncate leading-tight">
                  {item.title || item.domain || 'Unknown Source'}
                </p>
                <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground truncate">{item.domain}</span>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  item.status === 'success' ? 'bg-emerald-500' :
                  item.status === 'failed' ? 'bg-red-500' :
                  item.status === 'partial' ? 'bg-amber-500' : 'bg-zinc-400'
                )} />
                <span className="text-[10px] px-1.5 py-0 rounded bg-muted/50 text-muted-foreground uppercase tracking-wide">
                  {item.source_type}
                </span>
              </div>
              {item.description && (
                <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">{item.description}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderImages = () => {
    const allVisuals = [
      ...images.map(url => ({ type: 'image' as const, url })),
      ...diagrams.map(content => ({ type: 'diagram' as const, content })),
    ];

    if (allVisuals.length === 0) {
      return (
        <EmptyState
          icon={<Image className="w-5 h-5" />}
          title="No images yet"
          description="Images and diagrams will appear as the visualization agent runs."
        />
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2 p-3">
        {allVisuals.map((v, i) => (
          <div key={i} className="group relative rounded-lg border border-border bg-muted/30 overflow-hidden aspect-video">
            {v.type === 'image' && v.url ? (
              <img
                src={v.url}
                alt={`Research visual ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2">
                <pre className="text-[9px] text-muted-foreground font-mono overflow-hidden whitespace-pre-wrap leading-tight">
                  {v.type === 'diagram' ? v.content?.slice(0, 120) : ''}...
                </pre>
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <span className="text-[10px] text-white font-medium">
                {v.type === 'image' ? 'Figure' : 'Diagram'} {i + 1}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center px-1 py-1 gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-medium rounded-md transition-all',
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              {tab.icon}
              <span className="hidden xl:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  'text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full px-1',
                  activeTab === tab.key
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'links' && renderSourceList(
          allLinks,
          <Link2 className="w-5 h-5" />,
          'No links yet',
          'Web sources and news links will appear as agents scrape the web.'
        )}
        {activeTab === 'literature' && renderSourceList(
          literature,
          <BookOpen className="w-5 h-5" />,
          'No literature yet',
          'Academic papers from arXiv, PubMed, and OpenAlex will appear here.'
        )}
        {activeTab === 'surveys' && renderSourceList(
          surveys,
          <FileText className="w-5 h-5" />,
          'No surveys yet',
          'Datasets and survey data will appear as they are discovered.'
        )}
        {activeTab === 'images' && renderImages()}
      </div>
    </div>
  );
};
