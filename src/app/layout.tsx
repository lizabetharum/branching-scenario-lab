import type { Metadata } from "next";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Branching Scenario Lab",
  description: "Two AI-supported branching scenarios built for behavior change, with the design thinking, privacy decisions and guardrails shown in full.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
        <header className="border-b border-ink/10 bg-cream/90 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4" aria-label="Main">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-ink">
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
                <circle cx="5" cy="14" r="4" fill="#1d2433" />
                <path d="M9 14 C15 14 15 5 21 5 M9 14 C15 14 15 23 21 23" stroke="#1d2433" strokeWidth="2.5" fill="none" />
                <circle cx="23" cy="5" r="3.5" fill="#0f766e" />
                <circle cx="23" cy="23" r="3.5" fill="#e0704f" />
              </svg>
              Branching Scenario Lab
            </Link>
            <div className="flex gap-5 text-sm font-bold">
              <Link href="/scenario/grow" className="hover:text-teal-dark">Pharmacy</Link>
              <Link href="/scenario/jordan" className="hover:text-teal-dark">Classroom</Link>
              <Link href="/design" className="hover:text-teal-dark">How it was designed</Link>
            </div>
          </nav>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-ink/10 px-5 py-6 text-center text-xs text-ink/60">
          A design demonstration by Lizabeth Arum. All people, places and events are fictional. Not clinical decision support. No transcripts stored.
        </footer>
      </body>
    </html>
  );
}
