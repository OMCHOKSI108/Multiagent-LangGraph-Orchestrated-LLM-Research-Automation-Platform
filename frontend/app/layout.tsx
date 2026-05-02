import type { Metadata } from 'next';
import './globals.css';
import { Inter, Outfit } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ToastProvider';

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
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <ThemeProvider>
                <div className="min-h-screen flex flex-col app-shell">
                  <Navbar />
                  <main className="flex-1 relative z-10">{children}</main>
                </div>
                {/* Subtle ambient light-mode background glows */}
                <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                  <div className="absolute -top-40 left-1/2 h-80 w-[560px] -translate-x-1/2 rounded-full bg-teal-200/25 blur-3xl" />
                  <div className="absolute bottom-[-160px] right-[-80px] h-72 w-[420px] rounded-full bg-blue-200/20 blur-3xl" />
                  <div className="absolute top-1/3 left-[-100px] h-64 w-[320px] rounded-full bg-violet-200/15 blur-3xl" />
                </div>
              </ThemeProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
