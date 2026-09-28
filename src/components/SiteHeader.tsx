"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/scenario/labels", label: "The Label Conversation" },
  { href: "/scenario/pickup", label: "The Pickup Counter" },
  { href: "/scenario/jordan", label: "Can You Just Fix It?" },
  { href: "/author", label: "Build your own" },
  { href: "/design", label: "How it was designed" },
];

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <circle cx="5" cy="14" r="4" fill="#1d2433" />
      <path d="M9 14 C15 14 15 5 21 5 M9 14 C15 14 15 23 21 23" stroke="#1d2433" strokeWidth="2.5" fill="none" />
      <circle cx="23" cy="5" r="3.5" fill="#0f766e" />
      <circle cx="23" cy="23" r="3.5" fill="#e0704f" />
    </svg>
  );
}

// Below 1280 px the links collapse into a menu button, so the header never
// wraps or pushes the page wider than the screen.
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);

  // Close the menu after navigating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (href: string) =>
    `hover:text-teal-dark ${pathname === href ? "text-teal-dark underline decoration-2 underline-offset-4" : ""}`;

  return (
    <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex min-w-0 items-center gap-2 whitespace-nowrap font-extrabold text-ink">
          <Logo />
          <span className="truncate">Branching Scenario Lab</span>
        </Link>
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex gap-6 text-sm font-bold">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined} className={linkClass(l.href)}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          ref={button}
          type="button"
          className="shrink-0 rounded-full border-2 border-ink/20 px-4 py-1.5 text-sm font-bold xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-ink/10 xl:hidden">
          <ul className="mx-auto max-w-7xl px-5 py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined} className={`block py-3 text-base font-bold ${linkClass(l.href)}`}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
