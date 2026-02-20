import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import {
  FileText, Code, Globe, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Download, FileCode, FileType,
  ZoomIn, ZoomOut, Printer, RotateCcw, Minus, Plus,
  Image as ImageIcon, BarChart2, ChevronLeft, ChevronRight,
  Package
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { LatexTerminal } from './LatexTerminal';
import { api } from '../services/api';
import { toast } from 'sonner';

interface SourceInfo {
  source_type: string;
  domain: string;
  url?: string;
  status: 'success' | 'partial' | 'failed' | 'pending';
  title?: string;
  items_found: number;
}

interface DocumentPreviewProps {
  markdown?: string;
  latexSource?: string;
  systemStatus?: string;
  statusDetail?: string;
  className?: string;
  sources?: SourceInfo[];
  researchId?: string;
  images?: string[];
  diagrams?: string[];
}

/* ─── Confidence Bar ─── */
function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-xs font-semibold tabular-nums", textColor)}>{score}%</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Source Citations Summary ─── */
function SourceSummary({ sources }: { sources: SourceInfo[] }) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const verified = sources.filter(s => s.status === 'success').length;
    const partial = sources.filter(s => s.status === 'partial').length;
    const failed = sources.filter(s => s.status === 'failed').length;
    const total = sources.length;
    const confidence = total > 0 ? Math.round(((verified + partial * 0.5) / total) * 100) : 0;
    return { verified, partial, failed, total, confidence };
  }, [sources]);

  if (sources.length === 0) return null;

  return (
    <div className="border-t border-border bg-muted/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium">{stats.total} sources</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {stats.verified} verified
          </span>
          {stats.partial > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {stats.partial} partial
            </span>
          )}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-muted-foreground">Confidence:</span>
            <ConfidenceBar score={stats.confidence} />
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1 max-h-40 overflow-y-auto">
          {sources.map((source, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                source.status === 'success' ? 'bg-emerald-500' :
                  source.status === 'partial' ? 'bg-amber-500' :
                    source.status === 'failed' ? 'bg-red-500' : 'bg-muted-foreground'
              )} />
              <span className="text-muted-foreground truncate flex-1">
                {source.title || source.domain}
              </span>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline shrink-0"
                >
                  {source.domain}
                </a>
              )}
              <span className="text-muted-foreground tabular-nums shrink-0">
                {source.items_found} items
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Image Gallery Section (in-paper) ─── */
function ImageGallery({ images, diagrams }: { images: string[]; diagrams: string[] }) {
  const allVisuals = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...diagrams.map(content => ({ type: 'diagram' as const, content })),
  ];

  if (allVisuals.length === 0) return null;

  return (
    <div className="mt-8 border-t-2 border-zinc-200 dark:border-zinc-700 pt-6 px-2">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Figures & Visualizations</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {allVisuals.length} items
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allVisuals.map((v, i) => (
          <figure key={i} className="group relative rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            {v.type === 'image' && v.url ? (
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={v.url}
                  alt={`Figure ${i + 1}`}
                  className="w-full h-auto max-h-[400px] object-contain bg-zinc-50 dark:bg-zinc-900 p-2"
                  loading="lazy"
                />
              </a>
            ) : (
              <div className="w-full min-h-[120px] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-900">
                <pre className="text-[10px] text-muted-foreground font-mono overflow-hidden whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                  {v.type === 'diagram' ? v.content : ''}
                </pre>
              </div>
            )}
            <figcaption className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-2">
                {v.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  {v.type === 'image' ? 'Figure' : 'Diagram'} {i + 1}
                </span>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ─── Zoom Levels ─── */
const ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200];

/* ─── Main Component ─── */
export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  markdown,
  latexSource,
  systemStatus,
  statusDetail,
  className,
  sources = [],
  researchId,
  images = [],
  diagrams = [],
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [zoom, setZoom] = useState(100);
  const [exporting, setExporting] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomIn = useCallback(() => {
    const idx = ZOOM_LEVELS.findIndex(z => z >= zoom);
    const next = ZOOM_LEVELS[Math.min(idx + 1, ZOOM_LEVELS.length - 1)];
    setZoom(next);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    const idx = ZOOM_LEVELS.findIndex(z => z >= zoom);
    const prev = ZOOM_LEVELS[Math.max(idx - 1, 0)];
    setZoom(prev);
  }, [zoom]);

  const resetZoom = useCallback(() => setZoom(100), []);

  // Ctrl+scroll zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomIn, zoomOut]);

  const handleExport = useCallback(async (format: 'pdf' | 'latex' | 'markdown' | 'zip') => {
    if (!researchId) return;
    setExporting(format);
    try {
      if (format === 'pdf') await api.exportPDF(researchId);
      else if (format === 'latex') await api.exportLatex(researchId);
      else if (format === 'markdown') await api.exportMarkdown(researchId);
      else if (format === 'zip') await api.exportZip(researchId);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error(`Export failed. Try again.`);
    } finally {
      setExporting(null);
    }
  }, [researchId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Word count estimate
  const wordCount = useMemo(() => {
    if (!markdown) return 0;
    return markdown.split(/\s+/).filter(Boolean).length;
  }, [markdown]);

  const pageEstimate = Math.max(1, Math.ceil(wordCount / 300));

  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      {/* ═══════ TOP TOOLBAR (Chrome PDF viewer style) ═══════ */}
      <div className="shrink-0 h-10 bg-zinc-800 dark:bg-zinc-900 flex items-center justify-between px-2 gap-1 border-b border-zinc-700 dark:border-zinc-800">
        {/* Left: Mode Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-all',
              viewMode === 'preview'
                ? 'bg-zinc-600/70 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-all',
              viewMode === 'source'
                ? 'bg-zinc-600/70 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
            )}
          >
            <Code className="w-3.5 h-3.5" />
            LaTeX
          </button>

          {viewMode === 'preview' && (
            <>
              <div className="w-px h-4 bg-zinc-600 mx-1" />
              <span className="text-[10px] text-zinc-400 tabular-nums">
                ~{pageEstimate} {pageEstimate === 1 ? 'page' : 'pages'} &middot; {wordCount.toLocaleString()} words
              </span>
            </>
          )}
        </div>

        {/* Center: Zoom Controls */}
        {viewMode === 'preview' && (
          <div className="flex items-center gap-0.5">
            <button onClick={zoomOut} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors" title="Zoom Out">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetZoom} className="px-2 py-0.5 text-[11px] text-zinc-300 font-medium hover:bg-zinc-700 rounded transition-colors tabular-nums min-w-[44px] text-center" title="Reset Zoom">
              {zoom}%
            </button>
            <button onClick={zoomIn} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors" title="Zoom In">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right: Export Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
            title="Export PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">PDF</span>
          </button>
          <button
            onClick={() => handleExport('latex')}
            disabled={!!exporting}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
            title="Export LaTeX"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">LaTeX</span>
          </button>
          <button
            onClick={() => handleExport('markdown')}
            disabled={!!exporting}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
            title="Export Markdown"
          >
            <FileType className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">MD</span>
          </button>
          <button
            onClick={() => handleExport('zip')}
            disabled={!!exporting}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
            title="Download All"
          >
            <Package className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-zinc-600 mx-0.5" />
          <button
            onClick={handlePrint}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══════ DOCUMENT VIEW ═══════ */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'preview' ? (
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto pdf-viewer-bg"
          >
            {markdown ? (
              <div className="py-6 px-4 flex flex-col items-center gap-6 min-h-full">
                {/* Paper page with shadow (Chrome PDF style) */}
                <div
                  className="pdf-page"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    width: '816px', /* ~8.5 inches */
                    minHeight: '1056px', /* ~11 inches */
                  }}
                >
                  <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-research">
                    <MarkdownRenderer content={markdown} />
                  </article>

                  {/* Integrated Image Gallery inside paper */}
                  <ImageGallery images={images} diagrams={diagrams} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm opacity-50">Document preview will appear here.</p>
                <p className="text-xs opacity-30 mt-1">Start a research to generate your paper.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-background">
            <LatexTerminal
              initialLatex={latexSource || ''}
              researchId={researchId}
            />
          </div>
        )}
      </div>

      {/* ═══════ BOTTOM: Source Citations ═══════ */}
      <SourceSummary sources={sources} />
    </div>
  );
};
