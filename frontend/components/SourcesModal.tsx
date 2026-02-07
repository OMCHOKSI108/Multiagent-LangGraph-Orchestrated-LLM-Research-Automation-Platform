import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, ExternalLink } from 'lucide-react';

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

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
}

function getFaviconUrl(domain: string, favicon?: string): string {
  if (favicon) return favicon;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
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

export const SourcesModal: React.FC<SourcesModalProps> = ({ isOpen, onClose, sources }) => {
  const [filterText, setFilterText] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to allow animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setFilterText('');
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const filteredSources = sources.filter((source) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return (
      (source.title?.toLowerCase().includes(query)) ||
      source.domain.toLowerCase().includes(query) ||
      source.source_type.toLowerCase().includes(query) ||
      (source.description?.toLowerCase().includes(query))
    );
  });

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-5xl mx-4 my-8 rounded-2xl bg-light-primary dark:bg-dark-primary border border-light-300 dark:border-dark-300 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-300 dark:border-dark-300">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            All Sources
            <span className="text-sm font-normal text-zinc-400 dark:text-zinc-500 ml-2">
              ({sources.length})
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
              hover:bg-light-200 dark:hover:bg-dark-200 transition-colors
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-light-200 dark:border-dark-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter sources by title, domain, or type..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm
                bg-light-secondary dark:bg-dark-secondary
                border border-light-300 dark:border-dark-300
                text-zinc-800 dark:text-zinc-200
                placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                transition-colors"
            />
          </div>
        </div>

        {/* Sources Grid */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {filteredSources.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No sources match your filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSources.map((source, index) => (
                <a
                  key={`${source.url}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 p-3 rounded-xl
                    border border-light-300 dark:border-dark-300
                    bg-light-secondary dark:bg-dark-secondary
                    hover:border-indigo-300 dark:hover:border-indigo-700
                    hover:shadow-card transition-all duration-200"
                >
                  {/* Favicon */}
                  <img
                    src={getFaviconUrl(source.domain, source.favicon)}
                    alt=""
                    className="w-5 h-5 rounded-sm flex-shrink-0 mt-0.5"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {source.title || source.domain}
                    </h4>

                    {/* Domain */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono truncate">
                        {source.domain}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(source.status)}`} />
                    </div>

                    {/* Description */}
                    {source.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                        {source.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-light-200 dark:bg-dark-200 text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">
                        {source.source_type}
                      </span>
                      {source.items_found !== undefined && source.items_found > 0 && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {source.items_found} items
                        </span>
                      )}
                    </div>
                  </div>

                  <ExternalLink className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
