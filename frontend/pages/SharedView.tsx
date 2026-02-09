import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ExternalLink,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';

import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { DataExplorer } from '../components/DataExplorer';
import { DocumentPreview } from '../components/DocumentPreview';
import { PipelineTimeline } from '../components/PipelineTimeline';
import { JobStatus } from '../types';

/* =========================
   Types
========================= */

interface ResearchEvent {
  event_id: string;
  stage: string;
  severity: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  timestamp: string;
}

interface SourceItem {
  source_type: string;
  domain: string;
  url?: string;
  status: 'success' | 'partial' | 'failed' | 'pending';
  title?: string;
  items_found: number;
}

interface ResultJson {
  images?: string[];
  diagrams?: string[];
}

interface Research {
  id: string;
  topic: string;
  status: JobStatus;
  depth: string;
  result_json: ResultJson;
  report_markdown?: string;
  latex_source?: string;
  created_at: string;
  updated_at: string;
  username: string;
}

interface SharedResearch {
  research: Research;
  events: ResearchEvent[];
  sources: SourceItem[];
}

/* =========================
   Component
========================= */

export const SharedView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<SharedResearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* =========================
     Fetch shared research
  ========================= */

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    // Basic token sanity check (polish, not security)
    if (!/^[a-zA-Z0-9_-]{20,}$/.test(token)) {
      setError('Invalid or malformed share token');
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchSharedResearch = async () => {
      try {
        const response = await fetch(
          `/research/shared/${token}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Research not found'
              : 'Failed to load research'
          );
        }

        const result = await response.json();
        
        // Transform data to match expected interfaces
        const transformedData: SharedResearch = {
          research: result.research,
          events: (result.events || []).map((event: any, index: number): ResearchEvent => ({
            event_id: event.id || `event_${index}`,
            stage: event.stage || 'unknown',
            severity: event.severity || 'info',
            category: event.category || 'system',
            message: event.message || '',
            timestamp: event.timestamp || new Date().toISOString()
          })),
          sources: (result.sources || []).map((source: any): SourceItem => ({
            source_type: source.type || 'web',
            domain: source.domain || 'unknown',
            url: source.url,
            status: source.status || 'success',
            title: source.title || source.domain || 'Unknown Source',
            items_found: source.items_found || 0
          }))
        };
        
        setData(transformedData);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedResearch();
    return () => controller.abort();
  }, [token]);

  /* =========================
     Loading State
  ========================= */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading shared research…
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     Error State
  ========================= */

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            Research Not Available
          </h2>
          <p className="text-muted-foreground mb-4">
            {error || 'This shared research could not be loaded.'}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  /* =========================
     Derived State
  ========================= */

  const { research, events, sources } = data;

  const isCompleted = research.status === JobStatus.COMPLETED;

  const systemStatus = isCompleted
    ? 'Completed'
    : research.status || 'Unknown';

  const statusDetail = isCompleted
    ? 'This research has been completed and is ready for review.'
    : 'Research is in progress or incomplete.';

  const resultJson = research.result_json || {};

  const images = Array.isArray(resultJson.images)
    ? resultJson.images
    : [];

  const diagrams = Array.isArray(resultJson.diagrams)
    ? resultJson.diagrams
    : [];

  const visuals = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...diagrams.map(content => ({ type: 'diagram' as const, content }))
  ];

  /* =========================
     Render
  ========================= */

  return (
    <div className="h-screen flex flex-col bg-background">

      {/* ===== Header ===== */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="h-16 flex items-center justify-between px-6">

          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {research.topic}
            </h1>

            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {research.username}
              </div>

              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(research.created_at).toLocaleDateString()}
              </div>

              <span
                className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}
              >
                {research.status}
              </span>

              <span className="text-xs">
                {visuals.length} visuals
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Create Your Own
          </Button>
        </div>

        <div className="px-6 pb-4">
          <PipelineTimeline
            events={events}
            isActive={false}
            currentStage={null}
            jobStatus={research.status}
          />
        </div>
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 flex min-h-0">

        <div className="flex-1 border-r border-border bg-slate-50/50 dark:bg-card/30">
          <DataExplorer
            sources={sources}
            visuals={visuals}
            systemStatus={systemStatus}
            statusDetail={statusDetail}
          />
        </div>

        <div className="flex-1 bg-white dark:bg-card">
          <DocumentPreview
            markdown={research.report_markdown}
            latexSource={research.latex_source}
            systemStatus={systemStatus}
            statusDetail={statusDetail}
          />
        </div>

      </div>

      {/* ===== Footer ===== */}
      <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2">
        <p className="text-xs text-muted-foreground text-center">
          Powered by{' '}
          <span className="font-medium text-primary">
            Deep Research Engine
          </span>
          {' '}• Shared research view
        </p>
      </div>
    </div>
  );
};
