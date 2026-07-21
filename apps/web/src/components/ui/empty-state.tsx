import { type ReactNode } from "react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-brand-purple-400">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-5 max-w-sm text-base text-gray-500">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} loading={action.loading}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
