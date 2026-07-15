"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import { useResearchSSE } from "@/lib/sse";
import ResearchOutputPanel, { OutputTab } from "./ResearchOutputPanel";
import ResearchSidebar from "./ResearchSidebar";

type Depth = "Fast" | "Balanced" | "Deep";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Source {
  title: string;
  url: string;
}

const depths: Depth[] = ["Fast", "Balanced", "Deep"];

const START_RESEARCH = gql`
  mutation StartResearch($question: String!, $depth: String) {
    startResearch(question: $question, depth: $depth) {
      sessionId
      jobId
    }
  }
`;

const CANCEL_RESEARCH = gql`
  mutation CancelResearch($jobId: ID!) {
    cancelResearch(jobId: $jobId)
  }
`;

const FETCH_SESSION = gql`
  query ResearchSession($sessionId: ID!) {
    researchSession(sessionId: $sessionId) {
      id
      title
      status
      messages {
        role
        content
      }
      sources {
        title
        url
      }
    }
  }
`;

export default function ResearchChat({
  onLogout
}: {
  onLogout?: () => void;
}) {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>("report");
  const [depth, setDepth] = useState<Depth>("Deep");
  const [depthOpen, setDepthOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [splitPercent, setSplitPercent] = useState(55);
  const [reportContent, setReportContent] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [thinkingLabel, setThinkingLabel] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { status: sseStatus, progress, tokens, error: sseError } = useResearchSSE(activeJobId);
  const sseDone = sseStatus === "done";

  const canSend = value.trim().length > 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, tokens]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (depthRef.current && !depthRef.current.contains(event.target as Node)) {
        setDepthOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (progress) {
      setThinkingLabel(progress.message);
    }
  }, [progress]);

  useEffect(() => {
    if (tokens && activeJobId) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, content: tokens };
          return updated;
        }
        return [...prev, { role: "assistant", content: tokens }];
      });
    }
  }, [tokens, activeJobId]);

  useEffect(() => {
    if (sseDone && activeChatId) {
      setIsThinking(false);
      setThinkingLabel("");
      setActiveJobId(null);
      fetchSession(activeChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sseDone, activeChatId]);

  useEffect(() => {
    if (sseError) {
      setIsThinking(false);
      setThinkingLabel("");
      setActiveJobId(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Research failed: ${sseError}` },
      ]);
    }
  }, [sseError]);

  const handleCancel = async () => {
    if (!activeJobId) return;
    try {
      await client.mutate({
        mutation: CANCEL_RESEARCH,
        variables: { jobId: activeJobId },
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Research cancelled." },
      ]);
      setIsThinking(false);
      setThinkingLabel("");
      setActiveJobId(null);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to cancel research." },
      ]);
    }
  };

  const fetchSession = async (sessionId: string) => {
    try {
      const { data } = await client.query<{
        researchSession: { id: string; title: string; status: string; messages: { role: string; content: string }[]; sources: { title: string; url: string }[] };
      }>({
        query: FETCH_SESSION,
        variables: { sessionId },
        fetchPolicy: "network-only",
      });

      const session = data?.researchSession;
      if (session) {
        const msgs: Message[] = (session.messages || []).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        setMessages(msgs);
        const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
        setReportContent(lastAssistant?.content || "");
        setSources(session.sources || []);
      }
    } catch {
      setMessages([]);
    }
  };

  const handleSend = async () => {
    const question = value.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setValue("");
    setIsThinking(true);
    setThinkingLabel("Starting research pipeline...");
    setActiveOutputTab("report");

    try {
      const { data } = await client.mutate<{
        startResearch: { sessionId: string; jobId: string };
      }>({
        mutation: START_RESEARCH,
        variables: { question, depth },
      });

      const result = data?.startResearch;
      if (result) {
        setActiveChatId(result.sessionId);
        setActiveJobId(result.jobId);
        setThinkingLabel("Connecting to research pipeline...");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Research failed. Please try again." },
      ]);
      setIsThinking(false);
      setThinkingLabel("");
    }

    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
    event.target.value = "";
  };

  const handleNewChat = () => {
    setActiveJobId(null);
    setMessages([]);
    setValue("");
    setFile(null);
    setDepth("Deep");
    setIsThinking(false);
    setActiveOutputTab("report");
    setActiveChatId(undefined);
    setReportContent("");
    setSources([]);
    textareaRef.current?.focus();
  };

  const handleSelectChat = async (id: string) => {
    setActiveJobId(null);
    setActiveChatId(id);
    setIsThinking(false);
    setActiveOutputTab("report");
    fetchSession(id);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSplitPercent(Math.min(Math.max(percent, 25), 75));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const sidebarPadding = sidebarOpen ? "lg:pl-[300px]" : "lg:pl-16";

  return (
    <>
      <ResearchSidebar
        activeChatId={activeChatId}
        expanded={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onLogout={onLogout}
      />

      <main
        className={[
          `bg-[#E5A985] px-4 pb-4 sm:px-5 ${sidebarPadding}`,
          "lg:h-screen lg:overflow-hidden",
        ].join(" ")}
      >
        <div
          ref={containerRef}
          className="mx-auto grid min-w-0 gap-4 lg:flex lg:h-full lg:gap-0"
        >
          <section
            className="min-w-0 overflow-hidden rounded-[28px] border border-[#1a1a1a]/10 bg-white/12 shadow-[0_20px_80px_rgba(26,26,26,0.18)] lg:h-full"
            style={{ flex: `0 0 ${splitPercent}%` }}
          >
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-5">
                <div className="space-y-4">
                  {messages.length === 0 && !isThinking && (
                    <div className="flex h-full min-h-[300px] items-center justify-center">
                      <p className="text-center text-sm text-[#1a1a1a]/50">
                        Ask a research question to get started
                      </p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={[
                          "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%]",
                          message.role === "user"
                            ? "bg-[#1a1a1a] text-white"
                            : "border border-[#1a1a1a]/8 bg-white/70 text-[#1a1a1a]",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}

                  {isThinking && !activeJobId && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-[#E5A985]/25 bg-[#1a1a1a] px-3 py-2 text-xs text-[#E5A985]">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E5A985] [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E5A985] [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E5A985] [animation-delay:240ms]" />
                        </span>
                        {thinkingLabel}
                      </div>
                    </div>
                  )}

                  {isThinking && activeJobId && (
                    <div className="flex justify-start">
                      <div className="inline-flex max-w-[90%] items-center gap-2 rounded-xl border border-[#E5A985]/25 bg-[#1a1a1a] px-3 py-2 text-xs text-[#E5A985] sm:max-w-[82%]">
                        <span className="flex gap-1 shrink-0">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E5A985] [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E5A985] [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E5A985] [animation-delay:240ms]" />
                        </span>
                        <span className="truncate">{thinkingLabel}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="shrink-0 border-t border-[#1a1a1a]/10 px-4 pb-4 pt-3 sm:px-5">
                {file && (
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E5A985]/20 bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#E5A985]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3.5 w-3.5 shrink-0"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        aria-label="Remove selected file"
                        onClick={() => setFile(null)}
                        className="ml-1 rounded-full p-0.5 transition hover:bg-[#E5A985]/10"
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
                    </span>
                  </div>
                )}

                <div className="rounded-[30px] border border-[#E5A985]/25 bg-[#1a1a1a] p-2.5 shadow-[0_22px_80px_rgba(26,26,26,0.24)] transition-all focus-within:border-[#E5A985]/55">
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      aria-label="Upload source"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#E5A985]/70 transition hover:bg-[#E5A985]/10 hover:text-[#E5A985]"
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
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={value}
                      placeholder="Ask Multiagent Research Automation Platform anything..."
                      onChange={(event) => setValue(event.target.value)}
                      onKeyDown={handleKeyDown}
                      className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-white/45"
                    />

                    <div ref={depthRef} className="relative hidden shrink-0 sm:block">
                      <button
                        type="button"
                        onClick={() => setDepthOpen((prev) => !prev)}
                        className="flex items-center gap-1 rounded-full border border-[#E5A985]/15 px-3 py-2 text-xs text-[#E5A985]/75 transition hover:border-[#E5A985]/40 hover:bg-[#E5A985]/10 hover:text-[#E5A985]"
                      >
                        {depth}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-3 w-3"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>

                      {depthOpen && (
                        <div className="absolute bottom-full right-0 z-50 mb-2 w-32 rounded-xl border border-[#E5A985]/20 bg-[#1a1a1a] p-1.5 shadow-xl">
                          {depths.map((item) => (
                            <button
                              type="button"
                              key={item}
                              onClick={() => {
                                setDepth(item);
                                setDepthOpen(false);
                              }}
                              className={[
                                "w-full rounded-lg px-3 py-2 text-left text-xs transition",
                                depth === item
                                  ? "bg-[#E5A985]/10 text-[#E5A985]"
                                  : "text-white/55 hover:bg-[#E5A985]/8 hover:text-[#E5A985]",
                              ].join(" ")}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* STOP button - shown when research is running */}
                    {isThinking && activeJobId ? (
                      <button
                        type="button"
                        aria-label="Stop research"
                        onClick={handleCancel}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition hover:scale-105 hover:bg-red-600"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </button>
                    ) : canSend ? (
                      <button
                        type="button"
                        aria-label="Send message"
                        onClick={handleSend}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E5A985] text-[#1a1a1a] transition hover:scale-105"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          className="h-4 w-4"
                        >
                          <path d="M12 19V5" />
                          <path d="m5 12 7-7 7 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label="Start voice input"
                        onClick={() => console.log("voice clicked")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1a1a1a] transition hover:scale-105"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-4 w-4"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-end sm:hidden">
                    <select
                      value={depth}
                      onChange={(event) => setDepth(event.target.value as Depth)}
                      className="rounded-full border border-[#E5A985]/15 bg-transparent px-3 py-1.5 text-xs text-[#E5A985]/80 outline-none"
                    >
                      {depths.map((item) => (
                        <option key={item} value={item} className="bg-[#1a1a1a]">
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="mt-2 text-center text-[11px] text-[#1a1a1a]/50">
                  Enter to send - Shift + Enter for new line
                </p>
              </div>
            </div>
          </section>

          <div
            className="hidden shrink-0 cursor-col-resize items-center justify-center px-1 select-none lg:flex"
            onMouseDown={handleDragStart}
          >
            <div
              className={[
                "h-20 w-[3px] rounded-full transition-colors",
                isDragging
                  ? "bg-[#1a1a1a]/40"
                  : "bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/25",
              ].join(" ")}
            />
          </div>

          <div
            className="min-w-0 lg:h-full"
            style={{ flex: `0 0 ${100 - splitPercent}%` }}
          >
            <ResearchOutputPanel
              activeTab={activeOutputTab}
              onTabChange={setActiveOutputTab}
              reportContent={reportContent}
              sources={sources}
            />
          </div>
        </div>
      </main>
    </>
  );
}