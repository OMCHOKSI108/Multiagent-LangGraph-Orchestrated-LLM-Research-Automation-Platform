"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { getAuth } from "@/lib/auth";

interface DashboardHeaderProps {
  onLogout: () => void;
  showBrand?: boolean;
  compact?: boolean;
}

const menuItems = [
  { label: "Profile", href: "/profile" },
  { label: "Settings", href: "/settings" },
  { label: "Usage", href: "/" },
  { label: "Report", href: "/" },
];

export default function DashboardHeader({
  onLogout,
  showBrand = true,
  compact = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  return (
    <header
      className={`relative mx-auto mt-6 w-full ${
        compact ? "ml-0 lg:ml-16 mr-0 lg:mr-3" : ""
      }`}
      style={{
        borderRadius: "44px",
        maxWidth: compact ? "auto" : "calc(100% - 32px)",
        background: "linear-gradient(180deg, #222 0%, #1a1a1a 40%, #151515 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)",
        ...(compact ? { marginLeft: "1rem", marginRight: "1rem" } : {}),
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
      <div className={`px-6 py-4 ${compact ? "md:px-6 md:py-3" : "md:px-8 md:py-4"}`}>
        <div className={`flex items-center ${showBrand ? "justify-between" : "justify-end"}`}>
          {showBrand ? (
            <h1
              className="text-2xl md:text-4xl font-normal leading-tight text-center md:text-left"
              style={{
                color: "#E5A985",
                fontFamily: "Jost, Montserrat, sans-serif",
              }}
            >
              Multiagent Research Automation Platform
            </h1>
          ) : null}

          <div className="flex items-center gap-3">
            {/* Profile avatar + dropdown */}
            <div
              ref={containerRef}
              className="relative"
              onClick={() => setProfileOpen((p) => !p)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer select-none"
                style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
              >
                {getAuth()?.initials || "?"}
              </div>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-3 w-44 rounded-2xl p-2 shadow-xl"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(229,169,133,0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-150"
                      style={{ color: "#ccc" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(229,169,133,0.08)";
                        e.currentTarget.style.color = "#E5A985";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#ccc";
                      }}
                      onClick={() => {
                        if (item.href) {
                          router.push(item.href);
                          setProfileOpen(false);
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              className="px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 hover:opacity-80"
              style={{ borderColor: "#E5A985", color: "#E5A985" }}
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}