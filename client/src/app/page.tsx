"use client";

import { useEffect, useState } from "react";
import ResearchPainAnimation from "@/components/ResearchPainAnimation";
import AIAgentPipeline from "@/components/AIAgentPipeline";
import AuthModal from "@/components/AuthModal";
import Dashboard from "@/components/Dashboard";
import DashboardHeader from "@/components/DashboardHeader";
import ResearchChat from "@/components/ResearchChat";
import SettingsPage from "@/app/settings/page";
import Footer from "@/components/Footer";
import { getAuth, clearAuth, validateToken } from "@/lib/auth";

type AuthMode = "login" | "register" | "forgot";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [activeView, setActiveView] = useState<"dashboard" | "chat" | "settings">("dashboard");

  useEffect(() => {
    const existing = getAuth();
    if (existing?.loggedIn) {
      validateToken().then((user) => {
        if (user) setIsAuthenticated(true);
      });
    }
  }, []);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setAuthOpen(false);
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return (
      <>
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#E5A985" }}>
          <div
            className="fixed inset-0 pointer-events-none select-none z-0"
            style={{
              backgroundImage: `linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              opacity: 0.04,
            }}
          />
          <div className="relative z-10 flex flex-col min-h-screen">
            {activeView === "dashboard" ? (
              <>
                <DashboardHeader onLogout={handleLogout} showBrand />
                <Dashboard onNewSession={() => setActiveView("chat")} />
              </>
            ) : activeView === "settings" ? (
              <>
                <DashboardHeader onLogout={handleLogout} showBrand />
                <SettingsPage />
              </>
            ) : (
              <ResearchChat onLogout={handleLogout} />
            )}

            {activeView === "dashboard" && (
              <div className="mt-auto">
                <Footer />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col relative" style={{ backgroundColor: "#E5A985" }}>
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none select-none z-0"
        style={{
          backgroundImage: `linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          opacity: 0.04,
        }}
      />
      <div className="relative z-10">
      {/* ─────── Header ─────── */}
      <header
        className="relative mt-6 w-full mx-auto overflow-hidden"
        style={{
          borderRadius: "44px",
          maxWidth: "calc(100% - 32px)",
          background: "linear-gradient(180deg, #222 0%, #1a1a1a 40%, #151515 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-0 left-[15%] right-[15%] h-[1px] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(229,169,133,0.15) 50%, transparent)",
          }}
        />
        <div className="px-6 py-5 md:px-8 md:py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1
            className="text-3xl md:text-5xl font-normal leading-tight text-center md:text-left"
            style={{
              color: "#E5A985",
              fontFamily: "Jost, Montserrat, sans-serif",
            }}
          >
            Multiagent Research Automation Platform
          </h1>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:w-auto group">
            <button
              className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 group-hover:blur-sm hover:!blur-none"
              style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
              onClick={() => openAuth("login")}
            >
              Login
            </button>
            <button
              className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-medium border transition-all duration-300 group-hover:blur-sm hover:!blur-none"
              style={{ borderColor: "#E5A985", color: "#E5A985" }}
              onClick={() => openAuth("register")}
            >
              Register
            </button>
          </div>
        </div>
        </div>
      </header>

      <AIAgentPipeline />

      {/* ─────── Research Pain Animation Section ─────── */}
      <section className="flex flex-col md:flex-row items-center gap-10 md:gap-16 py-20 px-6 md:px-16 lg:px-24 max-w-6xl mx-auto">
        <div className="w-full md:w-[45%]">
          <h2 className="text-3xl md:text-4xl font-normal mb-4"
            style={{ color: "#1a1a1a", fontFamily: "Jost, Montserrat, sans-serif" }}>
            Research across the web,<br />without the chaos.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#1a1a1aBB" }}>
            Our Multiagent Research Automation Platform gathers, filters, and summarizes sources so you
            do not have to jump across dozens of tabs. One query, one organized
            result.
          </p>
        </div>
        <div className="w-full md:w-[45%]">
          <ResearchPainAnimation />
        </div>
      </section>

      <Footer />

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={(m) => setAuthMode(m)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  </div>
  );
}