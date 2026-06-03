type StatusProps = {
  title: string;
  message?: string;
};

// Handles getErrorMessage logic.
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Something went wrong.";
};

// Handles LoadingState logic.
export const LoadingState = ({ title, message }: StatusProps) => (
  <div className="status-box status-state" role="status" aria-live="polite">
    <p className="font-medium">{title}</p>
    {message && <p className="text-sm text-slate-600 mt-1">{message}</p>}
  </div>
);

// Handles ErrorState logic.
export const ErrorState = ({ title, message }: StatusProps) => (
  <div className="status-box border-red-100 bg-red-50 text-red-900" role="alert">
    <p className="font-medium">{title}</p>
    {message && <p className="text-sm mt-1">{message}</p>}
  </div>
);

// Handles EmptyState logic.
export const EmptyState = ({ title, message }: StatusProps) => (
  <div className="status-box border-dashed text-center">
    <p className="font-medium">{title}</p>
    {message && <p className="text-sm text-slate-600 mt-1">{message}</p>}
  </div>
);
