"use client";

import { useSyncExternalStore } from "react";

// Designer notes stay off the learner screens unless this is switched on.
// The choice is kept in this browser and shared by every component that reads it.
const KEY = "bsl-designer-view";
const EVENT = "bsl-designer-view-change";
let memory = false; // Used when the browser blocks storage.

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return memory;
  }
}

export function useDesignerView(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = (next: boolean) => {
    memory = next;
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Storage blocked: the switch still works until the page reloads.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, set];
}
