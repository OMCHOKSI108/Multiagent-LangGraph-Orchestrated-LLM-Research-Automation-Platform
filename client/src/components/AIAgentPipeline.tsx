"use client";

import { useEffect } from "react";

const agents = [
  {
    number: "01",
    title: "Router Agent",
    description:
      "Routes the user request to the correct pipeline — research, chat, or creative.",
    chips: ["Routing", "Intent", "Fast"],
  },
  {
    number: "02",
    title: "Planner Agent",
    description:
      "Breaks the task into clear steps and decides what information is needed.",
    chips: ["Planning", "Strategy", "Scoping"],
  },
  {
    number: "03",
    title: "Search Agent",
    description:
      "Searches across the web, papers, docs, GitHub, and trusted sources.",
    chips: ["Web Search", "APIs", "Indexing"],
  },
  {
    number: "04",
    title: "Source Evaluator Agent",
    description:
      "Filters low-quality sources and prioritizes reliable references.",
    chips: ["Quality", "Domain", "Freshness"],
  },
  {
    number: "05",
    title: "Extraction Agent",
    description:
      "Pulls key facts, snippets, links, and technical details from each source.",
    chips: ["Parsing", "Extraction", "Structuring"],
  },
  {
    number: "06",
    title: "Reasoning Agent",
    description:
      "Connects the information logically and removes contradictions.",
    chips: ["Logic", "Synthesis", "Coherence"],
  },
  {
    number: "07",
    title: "Summary Agent",
    description:
      "Converts messy research into a clean structured answer.",
    chips: ["Condensing", "Clarity", "Insights"],
  },
  {
    number: "08",
    title: "Final Report Agent",
    description:
      "Generates the final research report with citations, insights, and next steps.",
    chips: ["Report", "Citations", "Export"],
  },
];

type Agent = (typeof agents)[number];

function AgentCard({
  agent,
  align = "left",
}: {
  agent: Agent;
  align?: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <article
      data-agent-card
      className={[
        "group relative w-full max-w-[430px] rounded-[22px] border px-5 py-5",
        "bg-[#1a1a1a] shadow-[0_18px_60px_rgba(26,26,26,0.18)]",
        "transition-all duration-700 ease-out",
        "opacity-0 translate-y-6",
        "hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(26,26,26,0.26)]",
      ].join(" ")}
      style={{
        borderColor: "rgba(229, 169, 133, 0.28)",
      }}
    >
      <div
        className="absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(135deg, rgba(229,169,133,0.14), transparent 42%)",
        }}
      />

      <div className="relative z-10">
        <div
          className={[
            "mb-4 flex items-center gap-3",
            isRight ? "md:flex-row-reverse md:text-right" : "",
          ].join(" ")}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E5A985] text-sm font-bold text-[#1a1a1a] shadow-[0_0_24px_rgba(229,169,133,0.35)]">
            {agent.number}
          </span>

          <div className="min-w-0 flex-1">
            <div
              className={[
                "flex items-center gap-2",
                isRight ? "md:justify-end" : "",
              ].join(" ")}
            >
              <h3 className="text-base font-semibold text-white">
                {agent.title}
              </h3>
              <span className="hidden rounded-full border border-[#E5A98533] bg-[#E5A98514] px-2 py-0.5 text-[10px] font-medium text-[#E5A985] sm:inline-flex">
                Active
              </span>
            </div>
          </div>
        </div>

        <p
          className={[
            "text-sm leading-relaxed text-white/70",
            isRight ? "md:text-right" : "",
          ].join(" ")}
        >
          {agent.description}
        </p>

        <div
          className={[
            "mt-4 flex flex-wrap gap-2",
            isRight ? "md:justify-end" : "",
          ].join(" ")}
        >
          {agent.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[#E5A98533] bg-[#E5A98512] px-2.5 py-1 text-[11px] font-medium text-[#E5A985]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function DesktopTimelineRow({
  agent,
  index,
}: {
  agent: Agent;
  index: number;
}) {
  const isLeft = index % 2 === 0;

  return (
    <div className="relative hidden min-h-[142px] grid-cols-[1fr_72px_1fr] items-center md:grid">
      <div className="flex justify-end pr-3">
        {isLeft ? <AgentCard agent={agent} align="left" /> : null}
      </div>

      <div className="relative z-20 flex items-center justify-center">
        <div
          className={[
            "absolute top-1/2 h-px w-[86px] -translate-y-1/2",
            isLeft ? "right-1/2" : "left-1/2",
          ].join(" ")}
          style={{
            background: isLeft
              ? "linear-gradient(90deg, transparent, rgba(26,26,26,0.5), rgba(229,169,133,0.85))"
              : "linear-gradient(90deg, rgba(229,169,133,0.85), rgba(26,26,26,0.5), transparent)",
          }}
        />

        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#E5A985] shadow-[0_0_0_8px_rgba(229,169,133,0.18),0_0_35px_rgba(26,26,26,0.22)]">
          <div className="h-3 w-3 rounded-full bg-[#1a1a1a]" />
        </div>
      </div>

      <div className="flex justify-start pl-3">
        {!isLeft ? <AgentCard agent={agent} align="right" /> : null}
      </div>
    </div>
  );
}

function MobileTimelineRow({ agent }: { agent: Agent }) {
  return (
    <div className="relative pl-12 md:hidden">
      <div className="absolute left-[15px] top-6 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-[#E5A985] shadow-[0_0_0_7px_rgba(229,169,133,0.2)]">
        <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a1a]" />
      </div>

      <div className="pb-7">
        <AgentCard agent={agent} />
      </div>
    </div>
  );
}

export default function AIAgentPipeline() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-agent-card]")
    );

    if (reduceMotion) {
      cards.forEach((card) => {
        card.dataset.visible = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.dataset.visible = "true";
          observer.unobserve(target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#E5A985] py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0 select-none">
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="absolute left-1/2 top-16 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#1a1a1a]/10 blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-[260px] w-[260px] rounded-full bg-white/20 blur-[90px]" />
        <div className="absolute left-8 top-20 h-2 w-2 rounded-full bg-[#1a1a1a]/20" />
        <div className="absolute right-20 top-28 h-1.5 w-1.5 rounded-full bg-[#1a1a1a]/20" />
        <div className="absolute bottom-24 left-24 h-2.5 w-2.5 rounded-full bg-[#1a1a1a]/15" />
      </div>

      <div className="relative mx-auto max-w-[1120px] px-5 md:px-8">
        <header className="mx-auto mb-14 max-w-3xl text-center md:mb-16">

          <h2
            className="text-3xl font-normal tracking-tight text-[#1a1a1a] md:text-5xl"
            style={{ fontFamily: "Jost, Montserrat, sans-serif" }}
          >
            Our AI Agent Pipeline
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#1a1a1a]/75 md:text-base">
            Eight specialized agents work together to turn scattered web
            research into structured, source-backed intelligence.
          </p>
        </header>

        <div className="relative mx-auto max-w-[1040px]">
          <div
            className="absolute left-1/2 top-3 hidden h-[calc(100%-24px)] w-[2px] -translate-x-1/2 md:block"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(26,26,26,0.32) 8%, rgba(26,26,26,0.86) 50%, rgba(26,26,26,0.32) 92%, transparent)",
            }}
          />

          <div
            className="absolute left-[15px] top-3 h-[calc(100%-28px)] w-[2px] md:hidden"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(26,26,26,0.45) 8%, rgba(26,26,26,0.9) 50%, rgba(26,26,26,0.45) 92%, transparent)",
            }}
          />

          <div className="space-y-1 md:space-y-0">
            {agents.map((agent, index) => (
              <div key={agent.number}>
                <DesktopTimelineRow agent={agent} index={index} />
                <MobileTimelineRow agent={agent} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        [data-agent-card][data-visible="true"] {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-agent-card] {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }

          .animate-pulse {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}