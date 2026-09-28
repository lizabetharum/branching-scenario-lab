import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Branching Scenario Lab",
  description: "Three AI-supported practice scenarios in two formats, built for behavior change, with the design thinking, privacy decisions and guardrails shown in full.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-ink/10 px-5 py-6 text-center text-sm text-ink/80">
          A design demonstration by Lizabeth Arum. All people, places and events are fictional. Not clinical decision support. No transcripts stored.
        </footer>
      </body>
    </html>
  );
}
