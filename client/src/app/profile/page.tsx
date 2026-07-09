"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/auth";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [auth, setAuth] = useState(getAuth());
  useEffect(() => { setAuth(getAuth()); }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  if (!auth?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f4f1ed" }}>
        <div className="text-center">
          <p className="mb-4" style={{ fontFamily: "Georgia, serif", color: "#666" }}>Not signed in.</p>
          <Link href="/" className="px-6 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f4f1ed" }}>
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
              style={{ backgroundColor: "#1a1a1a", color: "#E5A985" }}
            >
              {auth.initials}
            </div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
              {auth.name}
            </h1>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f8f6f4" }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#888" }}>Email</p>
              <p style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>{auth.email}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f8f6f4" }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#888" }}>Initials</p>
              <p style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>{auth.initials}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <Link
              href="/settings"
              className="w-full py-3 rounded-full text-sm font-semibold text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1a1a1a", color: "#fff" }}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
