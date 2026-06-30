"use client";

type ErrorToastProps = {
  message: string;
  onDismiss: () => void;
};

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-white p-4 shadow-lg"
      role="alert"
    >
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-sm font-medium text-slate-900 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
