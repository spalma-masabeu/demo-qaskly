interface LoadingStateProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

const spinnerSizes = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({ label, size = "md", fullPage = false }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <span
        className={[
          "animate-spin rounded-full border-2 border-brand-purple-200 border-t-primary",
          spinnerSizes[size],
        ].join(" ")}
        aria-hidden="true"
      />
      {label && <p className="text-base text-gray-500">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{content}</div>;
}
