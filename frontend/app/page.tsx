'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <div className="max-w-[560px] mx-auto mt-16 px-5">
      <h1 className="text-2xl font-bold mb-2">Deep Research Platform</h1>
      <p className="leading-relaxed mb-3 text-gray-700">
        A multi-agent AI system that produces comprehensive, source-backed research reports.
        Submit any question and 20+ specialized agents will analyze it — covering literature
        review, web scraping, fact-checking, and scientific writing.
      </p>

      <hr className="border-t border-gray-200 my-5" />

      <div className="flex flex-col gap-4 mb-8">
        <div className="border border-gray-200 p-4">
          <h3 className="font-semibold mb-1">🔬 20+ Specialized Agents</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Domain intelligence, literature review, web scraping, gap synthesis, innovation scoring,
            technical verification, scientific writing, and more.
          </p>
        </div>
        <div className="border border-gray-200 p-4">
          <h3 className="font-semibold mb-1">🗂️ Workspace-Based Organization</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Organize research into workspaces. Each workspace holds multiple sessions with full
            history, live event feeds, and exportable reports.
          </p>
        </div>
        <div className="border border-gray-200 p-4">
          <h3 className="font-semibold mb-1">💬 Interactive Research Chat</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Chat with your research results. Use slash commands: <code>/research</code>,{' '}
            <code>/deepresearch</code>, <code>/gatherdata</code> for different analysis depths.
          </p>
        </div>
        <div className="border border-gray-200 p-4">
          <h3 className="font-semibold mb-1">📄 Structured Reports</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Get fully-formatted markdown reports with citations, sources, quality scores,
            and LaTeX support. Export as markdown or JSON.
          </p>
        </div>
      </div>

      <p className="text-base">
        <Link href="/signup" className="font-bold hover:underline">Sign Up</Link>
        &nbsp;&middot;&nbsp;
        <Link href="/login" className="font-bold hover:underline">Login</Link>
      </p>
    </div>
  );
}
