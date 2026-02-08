import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface Source {
  title?: string;
  url: string;
  domain: string;
  source_type: string;
  description?: string;
  favicon?: string;
  thumbnail?: string;
  items_found?: number;
  status: 'success' | 'partial' | 'failed' | 'pending';
}

interface SourceCardsProps {
  sources: Source[];
}

function getFaviconUrl(domain: string, favicon?: string): string {
  if (favicon) return favicon;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getStatusColor(status: Source['status']): string {
  switch (status) {
    case 'success':
      return 'bg-emerald-500';
    case 'partial':
      return 'bg-amber-500';
    case 'failed':
      return 'bg-red-500';
    case 'pending':
      return 'bg-zinc-400';
    default:
      return 'bg-zinc-400';
  }
}

const SourceCard: React.FC<{ source: Source }> = ({ source }) => {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-light-300 dark:border-dark-300
        bg-light-primary dark:bg-dark-secondary
        hover:border-indigo-300 dark:hover:border-indigo-700
        hover:shadow-card transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      {source.thumbnail && (
        <div className="h-28 overflow-hidden bg-light-200 dark:bg-dark-200">
          <img
            src={source.thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-3">
        {/* Domain row */}
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src={getFaviconUrl(source.domain, source.favicon)}
            alt=""
            className="w-4 h-4 rounded-sm flex-shrink-0"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-mono">
            {source.domain}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(source.status)}`} />
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug mb-1 line-clamp-2">
          {source.title ? truncate(source.title, 80) : source.domain}
        </h4>

        {/* Description */}
        {source.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-1.5">
            {source.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-light-200 dark:bg-dark-200 text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">
            {source.source_type}
          </span>
          <ExternalLink className="w-3 h-3 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </a>
  );
};

export const SourceCards: React.FC<SourceCardsProps> = ({ sources }) => {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 6;

  if (sources.length === 0) {
    return null;
  }

  const displayedSources = showAll ? sources : sources.slice(0, INITIAL_COUNT);
  const remainingCount = sources.length - INITIAL_COUNT;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayedSources.map((source, index) => (
          <SourceCard key={`${source.url}-${index}`} source={source} />
        ))}
      </div>

      {sources.length > INITIAL_COUNT && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg
              text-zinc-600 dark:text-zinc-400
              hover:bg-light-200 dark:hover:bg-dark-200
              border border-light-300 dark:border-dark-300
              transition-colors"
          >
            {showAll ? (
              <>
                Show less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                View {remainingCount} more <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
