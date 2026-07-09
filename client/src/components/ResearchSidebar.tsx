"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import { getAuth } from "@/lib/auth";

type ChatItem = {
  id: string;
  title: string;
  time: string;
};

interface ResearchSidebarProps {
  activeChatId?: string;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onLogout?: () => void;
}

const MY_SESSIONS_QUERY = gql`
  query MySessions {
    mySessions {
      id
      title
      createdAt
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

function Tooltip({ text }: { text: string }) {
  return (
    <span
      className="
        pointer-events-none absolute left-full top-1/2 z-[90] ml-3 hidden
        -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#E5A985]/20
        bg-[#1a1a1a] px-3 py-1.5 text-xs text-white opacity-0 shadow-xl
        transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 lg:block
      "
    >
      {text}
    </span>
  );
}

function SidebarIconButton({
  label,
  tooltip,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="
        group relative flex h-10 w-10 items-center justify-center rounded-xl
        text-[#E5A985]/70 transition-all duration-200
        hover:bg-[#E5A985]/12 hover:text-[#E5A985]
      "
    >
      {children}
      <Tooltip text={tooltip} />
    </button>
  );
}

export default function ResearchSidebar({
  activeChatId,
  onNewChat,
  onSelectChat,
  expanded,
  onToggle,
  onLogout,
}: ResearchSidebarProps) {
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<ChatItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const auth = getAuth();

  useEffect(() => {
    if (!expanded) return;
    client.query({ query: MY_SESSIONS_QUERY, fetchPolicy: "network-only" }).then((res) => {
      const data = res.data as { mySessions: { id: string; title: string; createdAt: string }[] };
      setSessions(data.mySessions.map((s) => ({ id: s.id, title: s.title, time: timeAgo(s.createdAt) })));
    }).catch(() => {});
  }, [expanded]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((chat) =>
      chat.title.toLowerCase().includes(query)
    );
  }, [search, sessions]);

  useEffect(() => {
    if (!expanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded, onToggle]);

  useEffect(() => {
    if (!expanded) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [expanded]);

  const handleNewChat = () => {
    setSearch("");
    onNewChat?.();

    if (expanded) {
      onToggle();
    }
  };

  const handleSearchClick = () => {
    if (!expanded) {
      onToggle();
    }

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 220);
  };

  const handleSelectChat = (id: string) => {
    onSelectChat?.(id);

    // Better for mobile drawer behavior.
    if (window.innerWidth < 1024 && expanded) {
      onToggle();
    }
  };

  return (
    <>
      {/* Collapsed Rail - Desktop */}
      <aside
        aria-label="Research history sidebar rail"
        className="
          fixed left-0 top-0 z-50 hidden h-screen w-16 flex-col items-center
          border-r border-[#E5A985]/15 bg-[#1f1714] py-3
          shadow-[10px_0_40px_rgba(26,26,26,0.18)] lg:flex
        "
      >
        <SidebarIconButton
          label="Open research history sidebar"
          tooltip="Open sidebar"
          onClick={onToggle}
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
            <Image
              src="/logo_deep.png"
              alt="Multiagent Research Automation Platform logo"
              width={30}
              height={30}
              className="h-full w-full object-contain"
              priority
            />
          </span>
        </SidebarIconButton>

        <div className="mt-3 w-6 border-t border-[#E5A985]/15" />

        <div className="mt-4 flex flex-col items-center gap-2">
          <SidebarIconButton
            label="New chat"
            tooltip="New chat"
            onClick={handleNewChat}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </SidebarIconButton>

          <SidebarIconButton
            label="Search chats"
            tooltip="Search chats"
            onClick={handleSearchClick}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </SidebarIconButton>

          <SidebarIconButton
            label="Chat history"
            tooltip="History"
            onClick={onToggle}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </SidebarIconButton>
        </div>

        <div className="flex-1" />

        <SidebarIconButton label="User profile" tooltip="Profile">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E5A985] text-xs font-bold text-[#1a1a1a]">
              {auth?.initials || "?"}
            </span>
        </SidebarIconButton>
      </aside>

      {/* Mobile Backdrop */}
      {expanded && (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Expanded Drawer */}
      <aside
        aria-label="Research history sidebar"
        className={[
          "fixed left-0 top-0 z-50 h-screen w-[300px] max-w-[calc(100vw-24px)]",
          "overflow-y-auto border-r border-[#E5A985]/15 bg-[#1f1714]",
          "transition-transform duration-300 ease-in-out",
          "shadow-[24px_0_90px_rgba(26,26,26,0.35)]",
          expanded ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
              <Image
                src="/logo_deep.png"
                alt="Multiagent Research Automation Platform logo"
                width={30}
                height={30}
                className="h-full w-full object-contain"
                priority
              />
            </span>

            <span className="truncate text-sm font-semibold text-[#E5A985]">
              Multiagent Research Automation Platform
            </span>
          </div>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onToggle}
            className="
              flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
              text-[#E5A985]/60 transition-all duration-200
              hover:bg-[#E5A985]/12 hover:text-[#E5A985]
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-1.5 px-3 pt-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="
              flex w-full items-center gap-3 rounded-2xl border border-[#E5A985]/15
              bg-[#E5A985]/5 px-4 py-3 text-sm text-[#E5A985]/90
              transition-all duration-200 hover:border-[#E5A985]/40 hover:bg-[#E5A985]/10
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>

          <button
            type="button"
            onClick={handleSearchClick}
            className="
              flex w-full items-center gap-3 rounded-2xl border border-[#E5A985]/15
              bg-[#E5A985]/5 px-4 py-3 text-sm text-[#E5A985]/90
              transition-all duration-200 hover:border-[#E5A985]/40 hover:bg-[#E5A985]/10
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search Chats
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#E5A985]/15 bg-[#E5A985]/6 px-3 py-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0 text-[#E5A985]/50"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="
                w-full bg-transparent text-sm text-[#E5A985]/90 outline-none
                placeholder:text-[#E5A985]/40
              "
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="
                  flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                  text-[#E5A985]/50 transition hover:text-[#E5A985]
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Recents */}
        <div className="px-3 pb-24 pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E5A985]/45">
            Recents
          </p>

          <div className="space-y-1">
            {filteredChats.length === 0 ? (
              <p className="rounded-2xl px-3 py-6 text-center text-sm text-[#E5A985]/35">
                No chats found
              </p>
            ) : (
              filteredChats.map((chat) => {
                const isActive = chat.id === activeChatId;

                return (
                  <button
                    type="button"
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={[
                      "group w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                      isActive
                        ? "border-[#E5A985]/70 bg-[#E5A985]/10"
                        : "border-transparent hover:border-[#E5A985]/30 hover:bg-[#E5A985]/10",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "truncate text-sm transition-colors",
                        isActive
                          ? "text-[#E5A985]"
                          : "text-[#E5A985]/85 group-hover:text-[#E5A985]",
                      ].join(" ")}
                    >
                      {chat.title}
                    </p>

                    <p className="mt-0.5 text-xs text-[#E5A985]/45">{chat.time}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Profile */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#E5A985]/12 bg-[#1f1714] px-3 py-3 space-y-2">
          {/* Profile Button */}
          <button
            type="button"
            className="
              flex w-full items-center gap-3 rounded-2xl px-3 py-2.5
              text-[#E5A985]/85 transition-all duration-200 hover:bg-[#E5A985]/10
            "
            onClick={() => console.log("profile clicked")}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5A985] text-xs font-bold text-[#1a1a1a]">
              {auth?.initials || "?"}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-[#E5A985]/90">{auth?.name || "User"}</p>
              <p className="truncate text-xs text-[#1a1a1a]/50">
                Research workspace
              </p>
            </div>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0 text-[#E5A985]/40"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="
                flex w-full items-center gap-3 rounded-2xl px-3 py-2.5
                text-[#E5A985]/85 transition-all duration-200 hover:bg-[#E5A985]/10
              "
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5A985] text-xs font-bold text-[#1a1a1a]">
                ⟰
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-[#E5A985]/90">Log out</p>
                <p className="truncate text-xs text-[#E5A985]/50">
                  Leave your research workspace
                </p>
              </div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}