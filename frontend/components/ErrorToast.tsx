"use client";

type ToastVariant = "error" | "success";

const STYLES: Record<ToastVariant, { border: string; text: string }> = {
  error: { border: "border-red-200", text: "text-red-700" },
  success: { border: "border-emerald-200", text: "text-emerald-700" },
};

type ToastProps = {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
};

export function Toast({ message, variant = "error", onDismiss }: ToastProps) {
  const style = STYLES[variant];
  const className = `fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-white p-4 shadow-lg ${style.border}`;

  const content = (
    <>
      <p className={`text-sm ${style.text}`}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-sm font-medium text-slate-900 hover:underline"
      >
        Dismiss
      </button>
    </>
  );

  if (variant === "error") {
    return (
      <div className={className} role="alert">
        {content}
      </div>
    );
  }

  return (
    <div className={className} role="status">
      {content}
    </div>
  );
}

/** @deprecated Use Toast with variant="error" */
export function ErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return <Toast message={message} variant="error" onDismiss={onDismiss} />;
}
