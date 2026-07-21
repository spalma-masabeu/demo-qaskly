"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

export function useMotionNumber(
  target: number,
  durationMs = 650,
  initialValue = target
): number {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);

  useEffect(() => {
    if (prefersReducedMotion || durationMs <= 0) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    if (Math.abs(target - valueRef.current) < 0.5) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const controls = animate(valueRef.current, target, {
      duration: durationMs / 1000,
      ease: "easeOut",
      onUpdate: (nextValue) => {
        valueRef.current = nextValue;
        setValue(nextValue);
      },
      onComplete: () => {
        valueRef.current = target;
        setValue(target);
      },
    });

    return () => controls.stop();
  }, [durationMs, prefersReducedMotion, target]);

  return value;
}
