"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastState {
  message: string;
  tone: "ok" | "bad";
  /** Incremented per call so repeat messages retrigger the animation. */
  nonce: number;
}

const ToastContext = createContext<(message: string, tone?: "ok" | "bad") => void>(() => {});

/** Fire a toast from anywhere below `<ToastProvider>`. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: "ok" | "bad" = "ok") => {
    setToast((previous) => ({ message, tone, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 1600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        // Announced politely so copy confirmations reach screen readers without
        // interrupting whatever is being read.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.nonce}
            className={`eyebrow rounded-md px-4 py-2.5 shadow-lg ${
              toast.tone === "ok" ? "bg-accent text-on-accent" : "bg-bad text-white"
            }`}
            style={{ animation: "toast-in 280ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            {toast.message}
          </div>
        )}
      </div>
      <style>{`
        @keyframes toast-in {
          from { transform: translateY(90px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
