"use client";

import { useEffect, useRef, useState } from "react";

const APP_DESCRIPTION =
  "Subscription Leak Finder is a simple financial tool designed to identify hidden, forgotten, or under-utilized recurring charges that quietly drain a user's bank account. It helps users visualize where small monthly costs compound into significant long-term financial drains.";

export default function Logo({ className = "" }: { className?: string }) {
  const [hovering, setHovering] = useState(false);
  const [clicked, setClicked] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = hovering || clicked;

  useEffect(() => {
    if (!clicked) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setClicked(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setClicked(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [clicked]);

  return (
    <div ref={rootRef} className={`relative flex items-center gap-2.5 ${className}`}>
      <svg width="51" height="51" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="leakFinderDripGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(355 80% 55%)" />
            <stop offset="16.6%" stopColor="hsl(27 80% 55%)" />
            <stop offset="33.3%" stopColor="hsl(46 80% 50%)" />
            <stop offset="50%" stopColor="hsl(152 70% 42%)" />
            <stop offset="66.6%" stopColor="hsl(201 75% 55%)" />
            <stop offset="83.3%" stopColor="hsl(248 75% 60%)" />
            <stop offset="100%" stopColor="hsl(286 75% 60%)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="22" fill="#000000" />
        <g transform="translate(0 2)">
          <path
            d="M58 10 C74 30 86 48 86 60 A28 28 0 1 1 30 60 C30 48 42 30 58 10 Z"
            fill="url(#leakFinderDripGrad)"
          />
          <path
            d="M22 66 C27 71 30 75 30 78 A8.5 8.5 0 1 1 13 78 C13 75 17 71 22 66 Z"
            fill="url(#leakFinderDripGrad)"
            opacity="0.85"
          />
        </g>
      </svg>

      <button
        type="button"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => setClicked((v) => !v)}
        aria-expanded={visible}
        aria-describedby="app-description"
        className="rounded font-sans text-[15px] font-extrabold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[hsl(201_85%_55%)] sm:text-base"
      >
        Subscription Leak Finder
      </button>

      {visible && (
        <div
          id="app-description"
          role="status"
          className="absolute left-1/2 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-border bg-surface p-3.5 text-left text-[12.5px] leading-relaxed text-muted shadow-lg"
        >
          {APP_DESCRIPTION}
        </div>
      )}
    </div>
  );
}
