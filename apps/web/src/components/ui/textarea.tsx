import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, className = "", ...props }, ref) {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={[
            "w-full resize-y rounded-lg border px-3.5 py-2.5 text-base text-gray-900 placeholder-gray-400",
            "min-h-[80px] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary/60",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            error
              ? "border-danger bg-danger-light/20 focus:ring-danger/50"
              : "border-gray-300 bg-white hover:border-brand-purple-400",
            className,
          ].join(" ")}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
