import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
}

const variantClasses = {
  default: "bg-white shadow-sm border border-gray-200",
  elevated: "bg-white shadow-brand border border-brand-purple-100",
  bordered: "bg-white border border-brand-purple-200",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ variant = "default", className = "", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={[
          "rounded-xl",
          variantClasses[variant],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={["px-5 pt-5 pb-4", className].join(" ")}
      {...props}
    />
  );
});

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CardContent({ className = "", ...props }, ref) {
  return (
    <div ref={ref} className={["px-5 pb-5", className].join(" ")} {...props} />
  );
});

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={[
        "border-t border-gray-100 px-5 py-3",
        className,
      ].join(" ")}
      {...props}
    />
  );
});
