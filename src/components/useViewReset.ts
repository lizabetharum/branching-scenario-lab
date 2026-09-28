"use client";

import { useEffect, useRef } from "react";

/**
 * When the view changes (intake to scenario, scenario to debrief, restart),
 * start at the top and move focus to the new heading. Without this, mobile
 * learners can land mid-page and miss the title, character and instructions.
 * Skips the first render so a normal page load behaves normally.
 */
export function useViewReset<T extends HTMLElement>(key: string, skipFirst = true) {
  const ref = useRef<T>(null);
  const first = useRef(skipFirst);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    ref.current?.focus({ preventScroll: true });
  }, [key]);
  return ref;
}
