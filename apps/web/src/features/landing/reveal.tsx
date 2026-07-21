"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET = 28;

const directionOffset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: OFFSET },
  down: { x: 0, y: -OFFSET },
  left: { x: OFFSET, y: 0 },
  right: { x: -OFFSET, y: 0 },
  none: { x: 0, y: 0 },
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Direction the element travels *from* as it enters. */
  direction?: Direction;
  /** Stagger delay in seconds. */
  delay?: number;
  /** Render as a different tag (e.g. "li", "section"). */
  as?: "div" | "section" | "li" | "span" | "article";
}

/**
 * Fades + slides its children into view on scroll. Animation plays once,
 * starts a little before the element is fully visible, and collapses to a
 * no-op when the user prefers reduced motion.
 */
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  as = "div",
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[as];
  const { x, y } = directionOffset[direction];

  const variants: Variants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x, y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </MotionTag>
  );
}
