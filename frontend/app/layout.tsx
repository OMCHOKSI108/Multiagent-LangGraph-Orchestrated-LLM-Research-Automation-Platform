import type { Metadata } from 'next';
import './globals.css';
import { Inter, Outfit } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'MARP – Multi‑Agentic Research Platform',
  description:
    'An open-source platform for automated research: topic discovery, literature review, verification, and report generation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${outfit.variable}`}>
      <body className="h-full font-sans">
        <AuthProvider>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col app-shell">
              <Navbar />
              <main className="flex-1 relative z-10">{children}</main>
            </div>
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-40 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="absolute bottom-[-160px] right-[-80px] h-72 w-[420px] rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#0f172a_0,_transparent_55%),radial-gradient(circle_at_bottom,_#020617_0,_transparent_55%)] opacity-70" />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
