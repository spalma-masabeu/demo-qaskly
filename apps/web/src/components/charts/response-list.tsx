"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type TextResponseResult } from "@/lib/api/types";

interface ResponseListProps {
  responses: TextResponseResult[];
  maxVisible?: number;
  variant?: "compact" | "immersive";
}

export function ResponseList({
  responses,
  maxVisible = 20,
  variant = "compact",
}: ResponseListProps) {
  const prefersReducedMotion = useReducedMotion();

  if (variant === "immersive") {
    const visible = responses.slice(0, 100);

    return (
      <div className="w-full">
        <div className="grid w-full grid-cols-1 gap-3 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <motion.div
              key={r.id}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold leading-snug text-slate-900 shadow-sm"
            >
              {r.text}
            </motion.div>
          ))}
        </div>

        {responses.length === 0 && (
          <p className="py-14 text-center text-2xl font-bold text-slate-400">
            Sin respuestas aún
          </p>
        )}
      </div>
    );
  }

  // compact
  const visible = responses.slice(0, maxVisible);
  const remaining = responses.length - visible.length;
  const cardTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: "easeOut" as const };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((r, index) => (
          <motion.div
            key={r.id}
            layout
            initial={
              prefersReducedMotion ? false : { opacity: 0, x: -36, scale: 0.98 }
            }
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{
              ...cardTransition,
              delay: prefersReducedMotion ? 0 : (index % 6) * 0.055,
            }}
            className="rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700"
          >
            {r.text}
          </motion.div>
        ))}
      </AnimatePresence>
      {remaining > 0 && (
        <p className="text-xs text-gray-400">
          +{remaining} respuesta{remaining !== 1 ? "s" : ""} más
        </p>
      )}
      {responses.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">
          Sin respuestas aún
        </p>
      )}
    </div>
  );
}
