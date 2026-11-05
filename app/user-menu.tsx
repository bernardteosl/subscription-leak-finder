"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function UserMenu({
  userName,
  userEmail,
}: {
  userName?: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${userName || userEmail}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-extrabold text-white ring-2 ring-transparent transition hover:ring-border focus-visible:ring-[hsl(201_85%_55%)]"
        style={{
          background:
            "conic-gradient(from 90deg, hsl(355 80% 55%), hsl(46 80% 55%), hsl(152 70% 42%), hsl(201 80% 55%), hsl(286 80% 60%), hsl(355 80% 55%))",
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="truncate text-sm font-extrabold text-foreground">
              {userName || "Your account"}
            </div>
            <div className="truncate text-xs text-muted">{userEmail}</div>
          </div>

          <Link
            href="/onboarding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-2"
          >
            Edit name
          </Link>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-danger hover:bg-surface-2"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
