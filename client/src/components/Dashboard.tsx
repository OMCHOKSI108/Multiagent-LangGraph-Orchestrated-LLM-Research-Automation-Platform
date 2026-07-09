"use client";

import { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import { getAuth } from "@/lib/auth";

interface DashboardProps {
  onNewSession: () => void;
}

const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboardStats {
      researchReports
      sourcesAnalyzed
      savedTemplates
    }
    recentSessions(limit: 5) {
      id
      title
      status
      createdAt
      updatedAt
    }
  }
`;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Dashboard({ onNewSession }: DashboardProps) {
  const [stats, setStats] = useState({ researchReports: 0, sourcesAnalyzed: 0, savedTemplates: 0 });
  const [sessions, setSessions] = useState<{ id: string; title: string; status: string; createdAt: string }[]>([]);
  const auth = getAuth();

  useEffect(() => {
    client.query({ query: DASHBOARD_QUERY, fetchPolicy: "network-only" }).then((res) => {
      const data = res.data as { dashboardStats: typeof stats; recentSessions: typeof sessions };
      setStats(data.dashboardStats);
      setSessions(data.recentSessions);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col relative" style={{ backgroundColor: "#E5A985" }}>
      <div
        className="fixed inset-0 pointer-events-none select-none z-0"
        style={{
          backgroundImage: `linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          opacity: 0.04,
        }}
      />
      <div className="relative z-10">
        <main className="mx-auto max-w-6xl px-6 pt-10 pb-20">
          <h1
            className="text-4xl md:text-5xl font-normal mb-2"
            style={{ color: "#1a1a1a", fontFamily: "Jost, Montserrat, sans-serif" }}
          >
            Welcome back, {auth?.name?.split(" ")[0] || "Explorer"}.
          </h1>
          <p className="text-base mb-10" style={{ color: "#1a1a1aBB" }}>
            Pick up where you left off or start a new deep research session.
          </p>

          <button
            className="px-8 py-4 rounded-full text-base font-semibold transition-opacity hover:opacity-90 mb-14"
            style={{ backgroundColor: "#1a1a1a", color: "#E5A985" }}
            onClick={onNewSession}
          >
            New Multiagent Research Automation Platform Session
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
            {[
              { label: "Research Reports", value: stats.researchReports },
              { label: "Sources Analyzed", value: stats.sourcesAnalyzed },
              { label: "Saved Templates", value: stats.savedTemplates },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl px-6 py-5"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(229,169,133,0.1)",
                }}
              >
                <p className="text-3xl font-bold text-white">{s.value.toLocaleString()}</p>
                <p className="text-sm mt-1" style={{ color: "#E5A985CC" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4" style={{ color: "#1a1a1a" }}>
            Recent Research
          </h2>
          {sessions.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-10 text-center"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p className="text-sm" style={{ color: "#888" }}>
                No research sessions yet. Start your first deep research!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = item.status === "completed" ? "rgba(34,197,94,0.6)" : "rgba(229,169,133,0.4)";
                    e.currentTarget.style.boxShadow = item.status === "completed" ? "0 0 28px rgba(34,197,94,0.18)" : "0 0 28px rgba(229,169,133,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>{timeAgo(item.createdAt)}</p>
                  </div>
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full shrink-0 self-start sm:self-center"
                    style={{
                      backgroundColor: item.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(229,169,133,0.1)",
                      color: item.status === "completed" ? "#22c55e" : "#E5A985",
                    }}
                  >
                    {item.status === "completed" ? "Completed" : "In Progress"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
