import { type HTMLAttributes } from "react";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function PageContainer({
  size = "xl",
  className = "",
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8",
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
