import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "ghost" | "primary" | "danger";
type Size = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  ghost: "text-gray-500 hover:bg-surface-muted hover:text-gray-900",
  primary: "text-primary hover:bg-primary-light",
  danger: "text-danger hover:bg-danger-light",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "ghost", size = "md", className = "", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={[
          "inline-flex cursor-pointer items-center justify-center rounded-lg transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
