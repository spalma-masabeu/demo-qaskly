"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface ReactionOverlayEvent {
  id: string;
  sessionId: string;
  emoji: string;
  receivedAt: number;
  pathSeed: number;
}

interface ReactionOverlayProps {
  reactions: ReactionOverlayEvent[];
  onReactionComplete?: (id: string) => void;
}

const maxVisibleReactions = 18;

export function ReactionOverlay({
  reactions,
  onReactionComplete,
}: ReactionOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const visibleReactions = reactions.slice(-maxVisibleReactions);

  if (visibleReactions.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute overflow-hidden"
      style={{
        bottom: "clamp(3rem, 8vh, 5rem)",
        left: "50%",
        width: "min(44rem, 78vw)",
        height: "min(34rem, 64vh)",
        transform: "translateX(-50%)",
      }}
    >
      <AnimatePresence initial={false}>
        {visibleReactions.map((reaction) => {
          const path = buildReactionPath(reaction.pathSeed);
          return (
            <motion.div
              key={reaction.id}
              className="absolute rounded-full border border-white/15 bg-white/10 px-3 py-2 text-4xl shadow-xl shadow-slate-950/20 backdrop-blur-sm md:text-5xl"
              style={{
                left: "50%",
                bottom: path.startY,
                marginLeft: "-2rem",
              }}
              initial={
                prefersReducedMotion
                  ? { opacity: 0, scale: 0.9 }
                  : {
                      opacity: 0,
                      x: path.startX,
                      y: 0,
                      scale: 0.78,
                      rotate: path.rotate,
                    }
              }
              animate={
                prefersReducedMotion
                  ? {
                      opacity: [0, 1, 1, 0],
                      y: [0, -16, -24],
                      scale: [0.95, 1, 1, 0.98],
                    }
                  : {
                      opacity: [0, 1, 1, 0],
                      x: [path.startX, path.midX, path.endX],
                      y: [0, -path.travelY * 0.55, -path.travelY],
                      scale: [0.78, 1.15, 1, 0.92],
                      rotate: [path.rotate, path.rotate * -0.3, 0],
                    }
              }
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: prefersReducedMotion ? 1.15 : 2.35,
                ease: "easeOut",
                times: [0, 0.18, 0.78, 1],
              }}
              onAnimationComplete={() => onReactionComplete?.(reaction.id)}
            >
              {reaction.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function buildReactionPath(seed: number): {
  startX: number;
  midX: number;
  endX: number;
  startY: number;
  travelY: number;
  rotate: number;
} {
  const normalized = seed - Math.floor(seed);
  const secondary = (normalized * 7.31) % 1;
  const tertiary = (normalized * 13.73) % 1;
  const lane = Math.floor(normalized * 3) - 1;
  const wobble = Math.round(secondary * 90 - 45);

  return {
    startX: Math.round(lane * 18 + tertiary * 18 - 9),
    midX: Math.round(lane * 118 + wobble),
    endX: Math.round(lane * 220 + wobble * 0.7),
    startY: Math.round(tertiary * 28),
    travelY: Math.round(270 + secondary * 190),
    rotate: Math.round(-14 + tertiary * 28),
  };
}
