"use client";

const websites = [
  "arXiv",
  "GitHub",
  "Nature",
  "IEEE",
  "Wikipedia",
  "Docs",
  "Search",
  "Papers",
];

const cardColors = [
  "#f8f9fa",
  "#f0f4ff",
  "#fff5f0",
  "#f0fff4",
  "#fff0f5",
  "#f5f0ff",
  "#f0faff",
  "#fffdf0",
];

const cardBorders = [
  "#e2e8f0",
  "#d0d9f0",
  "#f0d0c0",
  "#c0e0c0",
  "#f0c0d0",
  "#d0c0f0",
  "#c0e0f0",
  "#f0e8c0",
];

export default function ResearchPainAnimation() {
  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-lg bg-white"
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* ─── Desk ─── */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] rounded-t-[40px] bg-gray-50 border-t border-gray-100" />

      {/* Desk top line */}
      <div className="absolute bottom-[38%] left-0 right-0 h-[3px] bg-gray-100" />

      {/* ─── Monitor ─── */}
      <div
        className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[72%] h-[52%] rounded-xl overflow-hidden shadow-md border"
        style={{ backgroundColor: "#fafbfc", borderColor: "#e2e8f0" }}
      >
        {/* Screen inner */}
        <div className="absolute inset-[5px] rounded-lg overflow-hidden" style={{ backgroundColor: "#f7f8fa" }}>
          {/* URL bar */}
          <div className="h-5 bg-white border-b flex items-center px-2 gap-1.5" style={{ borderColor: "#eef0f2" }}>
            <span className="w-2 h-2 rounded-full bg-red-300" />
            <span className="w-2 h-2 rounded-full bg-yellow-300" />
            <span className="w-2 h-2 rounded-full bg-green-300" />
            <span className="ml-2 text-[7px] text-gray-400 font-mono">research.deepagent.ai</span>
          </div>

          {/* Screen content area */}
          <div className="relative w-full h-[calc(100%-20px)] overflow-hidden">
            {/* Floating website cards - chaotic phase */}
            {websites.map((site, i) => {
              const col = cardColors[i];
              const border = cardBorders[i];
              const isEven = i % 2 === 0;
              const xPos = isEven ? 5 + (i * 11) % 70 : 20 + (i * 8) % 60;
              const yBase = 10 + (i * 7) % 30;
              const delay = i * 0.4;
              return (
                <div
                  key={site}
                  className="absolute px-2 py-1 rounded text-[7px] font-medium whitespace-nowrap shadow-sm border"
                  style={{
                    left: `${xPos}%`,
                    top: `${yBase}%`,
                    backgroundColor: col,
                    borderColor: border,
                    color: "#1a1a1a",
                    animation: `research-card-float 10s ease-in-out ${delay}s infinite`,
                    zIndex: 10,
                  }}
                >
                  {i < 3 ? "📄 " : i < 6 ? "🔬 " : "📚 "}{site}
                </div>
              );
            })}

            {/* ─── Multiagent Research Automation Platform orb ─── */}
            <div
              className="absolute top-[35%] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full z-20"
              style={{
                background: "radial-gradient(circle, #E5A985 30%, #d49470 100%)",
                boxShadow: "0 0 20px rgba(229,169,133,0.4), 0 0 40px rgba(229,169,133,0.15)",
                animation: "research-agent-orb 10s ease-in-out infinite",
              }}
            >
              <div className="absolute inset-1 rounded-full bg-white/20 animate-pulse" />
              <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">
                AI
              </span>
            </div>

            {/* Agent ring */}
            <div
              className="absolute top-[35%] left-1/2 -translate-x-1/2 w-16 h-16 -ml-8 -mt-8 rounded-full z-10"
              style={{
                border: "1.5px solid #E5A98555",
                animation: "research-agent-ring 10s ease-in-out infinite",
              }}
            />

            {/* ─── Organized summary card ─── */}
            <div
              className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[80%] px-3 py-2 rounded-xl shadow-md z-20 border"
              style={{
                backgroundColor: "#1a1a1a",
                borderColor: "#333",
                animation: "research-summary-card 10s ease-in-out infinite",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E5A985" }}>
                  <span className="text-[5px] text-[#1a1a1a] font-bold">✓</span>
                </span>
                <span className="text-[7px] font-semibold" style={{ color: "#E5A985" }}>Multiagent Research Automation Platform</span>
              </div>
              <div className="space-y-0.5">
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "#E5A98533", width: "85%" }} />
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "#E5A98533", width: "60%" }} />
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "#E5A98522", width: "45%" }} />
              </div>
            </div>

            {/* Scanning line */}
            <div
              className="absolute left-0 right-0 h-[1.5px] opacity-40"
              style={{
                background: "linear-gradient(90deg, transparent, #E5A985, transparent)",
                animation: "research-scan-line 4s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      {/* Monitor stand */}
      <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[4%] h-[3%] bg-gray-200 rounded-b" />

      {/* Monitor base */}
      <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 w-[16%] h-[2%] bg-gray-200 rounded-sm" />

      {/* ─── Researcher ─── */}
      <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[22%] h-[32%]">
        {/* Body */}
        <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[55%] h-[60%] rounded-t-2xl bg-gray-200">
          {/* Arm reaching toward keyboard */}
          <div className="absolute -right-[30%] bottom-[20%] w-[40%] h-[8%] rounded-full bg-gray-200 rotate-[-20deg]" />
          <div className="absolute -left-[30%] bottom-[20%] w-[40%] h-[8%] rounded-full bg-gray-200 rotate-[20deg]" />
        </div>

        {/* Head */}
        <div className="absolute bottom-[64%] left-1/2 -translate-x-1/2 w-[40%] aspect-square rounded-full bg-gray-200">
          {/* Frustration stress lines */}
          <div className="absolute -top-1 -right-1 flex flex-col gap-0.5" style={{ animation: "research-stress 2s ease-in-out infinite" }}>
            <span className="block w-3 h-[1.5px] bg-red-300" style={{ transform: "rotate(-15deg)" }} />
            <span className="block w-2.5 h-[1.5px] bg-red-300" style={{ transform: "rotate(-10deg)" }} />
            <span className="block w-2 h-[1.5px] bg-red-300" style={{ transform: "rotate(-5deg)" }} />
          </div>

          {/* Question mark */}
          <div
            className="absolute -top-3 -left-1 text-[10px] font-bold text-red-300"
            style={{ animation: "research-question 3s ease-in-out infinite" }}
          >
            ?
          </div>

          {/* Face glow from screen */}
          <div className="absolute inset-0 rounded-full opacity-10" style={{
            background: "radial-gradient(ellipse at 50% 40%, #E5A985 0%, transparent 70%)",
          }} />
        </div>
      </div>

      {/* ─── Side floating snippets ─── */}
      <div
        className="absolute top-[12%] left-[4%] p-2 rounded-lg shadow-sm border border-gray-100"
        style={{ animation: "research-snippet-a 8s ease-in-out infinite" }}
      >
        <div className="flex gap-1 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#E5A985" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
        </div>
        <div className="w-12 h-1.5 rounded bg-gray-100" />
        <div className="w-8 h-1.5 rounded bg-gray-50 mt-1" />
      </div>

      <div
        className="absolute top-[18%] right-[4%] p-2 rounded-lg shadow-sm border border-gray-100"
        style={{ animation: "research-snippet-b 10s ease-in-out infinite" }}
      >
        <div className="w-10 h-1.5 rounded bg-gray-100 mb-1" />
        <div className="w-7 h-1.5 rounded bg-gray-50" />
      </div>
    </div>
  );
}
