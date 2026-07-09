"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import { getAuth, clearAuth } from "@/lib/auth";
import Link from "next/link";

const MY_SETTINGS_QUERY = gql`
  query MySettings {
    mySettings {
      bio
      dob
      personalizationPrompt
      defaultDepth
      outputStyle
      citationPreference
      exportPreference
    }
  }
`;

const UPDATE_SETTINGS_MUTATION = gql`
  mutation UpdateSettings(
    $bio: String
    $dob: String
    $personalizationPrompt: String
    $defaultDepth: String
    $outputStyle: String
    $citationPreference: String
    $exportPreference: String
  ) {
    updateSettings(
      bio: $bio
      dob: $dob
      personalizationPrompt: $personalizationPrompt
      defaultDepth: $defaultDepth
      outputStyle: $outputStyle
      citationPreference: $citationPreference
      exportPreference: $exportPreference
    ) {
      bio
      dob
      personalizationPrompt
      defaultDepth
      outputStyle
      citationPreference
      exportPreference
    }
  }
`;

interface Settings {
  bio: string;
  dob: string;
  personalizationPrompt: string;
  defaultDepth: string;
  outputStyle: string;
  citationPreference: string;
  exportPreference: string;
}

const defaultSettings: Settings = {
  bio: "",
  dob: "",
  personalizationPrompt: "I prefer structured explanations with clear steps, technical depth, examples, and source-backed reasoning.",
  defaultDepth: "Deep",
  outputStyle: "Detailed",
  citationPreference: "Standard",
  exportPreference: "PDF",
};

export default function SettingsPage() {
  const router = useRouter();
  const [auth, setAuth] = useState(getAuth());
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setAuth(getAuth());
    client.query({ query: MY_SETTINGS_QUERY, fetchPolicy: "network-only" }).then((res) => {
      const data = res.data as { mySettings: Settings | null };
      if (data.mySettings) {
        setSettings((prev) => ({ ...prev, ...data.mySettings }));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await client.mutate({
        mutation: UPDATE_SETTINGS_MUTATION,
        variables: settings,
      });
      setSaveMessage("Settings saved.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("Failed to save.");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/")} className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-70" style={{ color: "#1a1a1a" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
                Settings
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/profile" className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: "#1a1a1a", color: "#E5A985" }}>
                {auth.initials}
              </Link>
              <button
                onClick={() => { clearAuth(); router.push("/"); }}
                className="px-4 py-2 rounded-full text-sm font-medium border transition-opacity hover:opacity-80"
                style={{ borderColor: "#1a1a1a", color: "#1a1a1a" }}
              >
                Logout
              </button>
            </div>
          </div>

          {!loaded ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p style={{ fontFamily: "Georgia, serif", color: "#888" }}>Loading settings…</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              {saveMessage && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: saveMessage === "Settings saved." ? "#22c55e20" : "#ef444420", color: saveMessage === "Settings saved." ? "#22c55e" : "#ef4444" }}>
                  {saveMessage}
                </div>
              )}

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: "#1a1a1a", fontFamily: "Georgia, serif" }}>Profile</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Full Name</label>
                    <p className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#f8f6f4", color: "#1a1a1a" }}>{auth.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Email</label>
                    <p className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#f8f6f4", color: "#1a1a1a" }}>{auth.email}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Date of Birth</label>
                    <input type="date" value={settings.dob} onChange={(e) => updateSetting("dob", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none border" style={{ borderColor: "#ddd", color: "#1a1a1a" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Bio</label>
                    <input type="text" value={settings.bio} onChange={(e) => updateSetting("bio", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none border" style={{ borderColor: "#ddd", color: "#1a1a1a" }} />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: "#1a1a1a", fontFamily: "Georgia, serif" }}>Personalization Prompt</h2>
                <textarea value={settings.personalizationPrompt} onChange={(e) => updateSetting("personalizationPrompt", e.target.value)}
                  rows={4} className="w-full px-4 py-3 rounded-xl text-sm outline-none border" style={{ borderColor: "#ddd", color: "#1a1a1a", resize: "vertical" }} />
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: "#1a1a1a", fontFamily: "Georgia, serif" }}>Research Preferences</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Default Depth", key: "defaultDepth" as const, options: ["Fast", "Balanced", "Deep"] },
                    { label: "Output Style", key: "outputStyle" as const, options: ["Concise", "Detailed", "Report-like"] },
                    { label: "Citation Preference", key: "citationPreference" as const, options: ["Minimal", "Standard", "Full"] },
                    { label: "Export Preference", key: "exportPreference" as const, options: ["PDF", "LaTeX", "Markdown"] },
                  ].map(({ label, key, options }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>{label}</label>
                      <select value={settings[key]} onChange={(e) => updateSetting(key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none border" style={{ borderColor: "#ddd", color: "#1a1a1a" }}>
                        {options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSaving}
                  className="flex-1 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>
                  {isSaving ? "Saving…" : "Save Settings"}
                </button>
                <button type="button" onClick={() => { clearAuth(); router.push("/"); }}
                  className="px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}>
                  Logout
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
