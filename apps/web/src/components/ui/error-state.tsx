import { AlertCircle } from "lucide-react";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLoading?: boolean;
}

export function ErrorState({
  title = "Algo salió mal",
  message,
  onRetry,
  retryLoading,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-light">
        <AlertCircle className="h-8 w-8 text-danger" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mb-5 max-w-sm text-base text-gray-500">{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry} loading={retryLoading}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
