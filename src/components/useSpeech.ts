"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Browser speech-to-text. The app receives text only. Audio goes to the
// browser's own speech service (Google in Chrome, Apple in Safari).
export function useSpeech(onText: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  }, [onText]);

  useEffect(() => {
    const w = window as any;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.abort?.();
  }, []);

  function toggle() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) return rec.current?.stop();
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let t = "";
      for (let k = 0; k < e.results.length; k++) t += e.results[k][0].transcript;
      cb.current(t);
    };
    r.onerror = (e: any) => {
      setError(e.error === "not-allowed" ? "Microphone access was blocked. You can type instead." : "Speech recognition stopped. Try again or type.");
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  }

  return { supported, enabled, enable: () => setEnabled(true), listening, toggle, error, stop: () => rec.current?.abort?.() };
}

export const VOICE_NOTICE =
  "If you turn on voice input, your browser's speech service turns your voice into text. In Chrome that service is Google's, and in Safari it is Apple's, so your audio may leave your device. This app never receives audio. It receives only the text, which you can edit before sending.";
