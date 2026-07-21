"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ALLOWED_REACTIONS,
  type AllowedReaction,
} from "@qaskly/shared";

interface AudienceReactionFabProps {
  disabled?: boolean;
  onSend: (emoji: AllowedReaction) => void;
}

const defaultReaction = ALLOWED_REACTIONS[0];
const remainingReactions = ALLOWED_REACTIONS.slice(1);

export function AudienceReactionFab({
  disabled = false,
  onSend,
}: AudienceReactionFabProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeReaction, setActiveReaction] =
    useState<AllowedReaction>(defaultReaction);
  const paletteId = useId();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (disabled) {
      setExpanded(false);
    }
  }, [disabled]);

  const handleSend = useCallback(
    (emoji: AllowedReaction) => {
      if (disabled) return;
      setActiveReaction(emoji);
      onSend(emoji);
    },
    [disabled, onSend]
  );

  const handleDefaultClick = useCallback(() => {
    if (disabled) return;
    if (!expanded) {
      setExpanded(true);
      return;
    }
    handleSend(defaultReaction);
  }, [disabled, expanded, handleSend]);

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-50 flex flex-col items-end gap-3 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6">
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={paletteId}
            className="flex flex-col-reverse items-center gap-2"
            aria-label="Reacciones"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
          >
            {remainingReactions.map((emoji, index) => (
              <ReactionEmojiButton
                key={emoji}
                emoji={emoji}
                active={activeReaction === emoji}
                disabled={disabled}
                onSend={handleSend}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: 18, scale: 0.72 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 10, scale: 0.82 }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        stiffness: 520,
                        damping: 22,
                        delay: index * 0.055,
                    }
                }
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <ReactionEmojiButton
        emoji={defaultReaction}
        active={activeReaction === defaultReaction}
        onClick={handleDefaultClick}
        disabled={disabled}
        aria-expanded={expanded}
        aria-controls={expanded ? paletteId : undefined}
        aria-label={
          expanded ? `Enviar reacción ${defaultReaction}` : "Abrir reacciones"
        }
        title={expanded ? `Enviar ${defaultReaction}` : "Reacciones"}
        size="lg"
      />
    </div>
  );
}

interface ReactionEmojiButtonProps {
  emoji: AllowedReaction;
  active: boolean;
  disabled?: boolean;
  onSend?: (emoji: AllowedReaction) => void;
  onClick?: () => void;
  initial?: false | Record<string, number>;
  animate?: Record<string, number>;
  exit?: Record<string, number>;
  transition?: Record<string, unknown>;
  size?: "sm" | "lg";
  title?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}

function ReactionEmojiButton({
  emoji,
  active,
  disabled = false,
  onSend,
  onClick,
  initial,
  animate,
  exit,
  transition,
  size = "sm",
  title,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: ReactionEmojiButtonProps) {
  const dimensionClass =
    size === "lg" ? "h-14 w-14 text-3xl" : "h-12 w-12 text-2xl";

  return (
    <motion.button
      type="button"
      onClick={onClick ?? (() => onSend?.(emoji))}
      disabled={disabled}
      title={title ?? `Enviar ${emoji}`}
      aria-label={ariaLabel ?? `Enviar reacción ${emoji}`}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      className={[
        "relative isolate inline-flex items-center justify-center overflow-hidden rounded-full border font-medium shadow-lg transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary/70 text-primary-foreground shadow-primary/25"
          : "border-white/70 bg-white text-gray-900 shadow-slate-900/15 hover:bg-primary/10",
        dimensionClass,
      ].join(" ")}
    >
      {active && (
        <motion.span
          layoutId="audience-reaction-active-bg"
          className="absolute inset-0 -z-10 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        />
      )}
      <span className="relative z-10">{emoji}</span>
    </motion.button>
  );
}
