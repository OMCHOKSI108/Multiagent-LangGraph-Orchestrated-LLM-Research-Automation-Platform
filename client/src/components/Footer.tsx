import Image from "next/image";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#overview" },
      { label: "AI Agent Pipeline", href: "#pipeline" },
      { label: "Multiagent Workflow", href: "#workflow" },
      { label: "Source-backed Answers", href: "#sources" },
      { label: "Report Generation", href: "#reports" },
      { label: "Use Cases", href: "#use-cases" },
    ],
  },
  {
    title: "Research",
    links: [
      { label: "Web Research", href: "#web-research" },
      { label: "Academic Papers", href: "#academic" },
      { label: "GitHub & Docs", href: "#github-docs" },
      { label: "Market Research", href: "#market" },
      { label: "Technical Research", href: "#technical" },
      { label: "Competitive Analysis", href: "#competitive" },
    ],
  },
  {
    title: "Agents",
    links: [
      { label: "Router Agent", href: "#router-agent" },
      { label: "Planner Agent", href: "#planner-agent" },
      { label: "Search Agent", href: "#search-agent" },
      { label: "Source Evaluator", href: "#source-evaluator" },
      { label: "Reasoning Agent", href: "#reasoning-agent" },
      { label: "Final Report Agent", href: "#report-agent" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#docs" },
      { label: "API Roadmap", href: "#api-roadmap" },
      { label: "Prompt Library", href: "#prompts" },
      { label: "Research Templates", href: "#templates" },
      { label: "Changelog", href: "#changelog" },
      { label: "FAQs", href: "#faqs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Contact", href: "#contact" },
      { label: "Portfolio", href: "#portfolio" },
      { label: "GitHub", href: "#github" },
      { label: "Privacy Policy", href: "#privacy" },
      { label: "Terms of Use", href: "#terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#help" },
      { label: "Report a Bug", href: "#bug" },
      { label: "Request Feature", href: "#feature" },
      { label: "Contact Email", href: "mailto:hello@deepresearchagent.com" },
      { label: "Community", href: "#community" },
    ],
  },
];

function SocialIcon({ name, href }: { name: string; href: string }) {
  const icon = () => {
    switch (name) {
      case "X":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case "GitHub":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
        );
      case "LinkedIn":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        );
      case "Instagram":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        );
      case "Discord":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.1776-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200"
      style={{ color: "#888", backgroundColor: "rgba(255,255,255,0.04)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#E5A985";
        e.currentTarget.style.backgroundColor = "rgba(229,169,133,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#888";
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
      }}
    >
      {icon()}
    </a>
  );
}

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#050505" }}>
      {/* Top border separator */}
      <div className="w-full h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />

      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        {/* ─────── Brand + Columns ─────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-10 lg:gap-8">
          {/* Brand column — spans full width on mobile, first column on grid */}
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
            <h2
              className="text-xl font-semibold tracking-tight"
              style={{ color: "#E5A985" }}
            >
              Multiagent Research Automation Platform
            </h2>
            <p className="mt-3 text-sm leading-relaxed max-w-xs" style={{ color: "#888" }}>
              An AI-powered research automation system that turns scattered web sources
              into structured, source-backed intelligence.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {[].map(
                (badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 text-[11px] font-medium rounded-full"
                    style={{
                      backgroundColor: "rgba(229,169,133,0.08)",
                      color: "#E5A985CC",
                      border: "1px solid rgba(229,169,133,0.12)",
                    }}
                  >
                    {badge}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3
                className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                style={{ color: "#666" }}
              >
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors duration-150"
                      style={{ color: "#ccc" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#E5A985";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#ccc";
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ─────── Creator credit — right aligned ─────── */}
        <div className="flex justify-end mt-12 md:mt-14">
          <div
            className="w-full max-w-[380px] rounded-[24px] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)]"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.45)" }}>
              Built by
            </p>
            <div className="mt-3 flex items-center gap-6 flex-wrap">
              <p className="text-7xl font-bold tracking-tight text-white leading-none">
                OM
              </p>
              <div
                className="shrink-0 rounded-2xl px-4 py-3"
                style={{ backgroundColor: "#fff" }}
              >
                <Image
                  src="/aceintelligence.svg"
                  alt="Ace Intelligence logo"
                  width={180}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────── Bottom bar ─────── */}
      <div className="w-full h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Social icons */}
          <div className="flex items-center gap-2">
            <SocialIcon name="X" href="#" />
            <SocialIcon name="GitHub" href="#" />
            <SocialIcon name="LinkedIn" href="#" />
            <SocialIcon name="Instagram" href="#" />
            <SocialIcon name="Discord" href="#" />
            {/* TODO: Replace # hrefs with actual URLs when available */}
          </div>

          {/* Copyright */}
          <p className="text-xs" style={{ color: "#666" }}>
            &copy; 2026 Multiagent Research Automation Platform. Built by Om Choksi.
          </p>

          {/* Language / Location pills */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#888",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              English
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#888",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
