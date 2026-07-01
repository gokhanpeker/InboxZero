type AlertVariant = "error" | "success" | "info";

const STYLES: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

type AlertProps = {
  variant?: AlertVariant;
  children: React.ReactNode;
};

export function Alert({ variant = "error", children }: AlertProps) {
  const className = `rounded-lg border px-4 py-3 text-sm ${STYLES[variant]}`;

  if (variant === "error") {
    return (
      <p className={className} role="alert">
        {children}
      </p>
    );
  }

  return (
    <p className={className} role="status">
      {children}
    </p>
  );
}
