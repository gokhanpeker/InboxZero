import Link from "next/link";

const BASE =
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS = {
  primary: "bg-slate-900 px-4 py-2 text-white hover:bg-slate-800",
  secondary: "border border-slate-300 bg-white px-4 py-2 text-slate-900 hover:bg-slate-50",
  ghost: "px-3 py-1.5 text-slate-700 hover:bg-slate-100",
};

type ButtonProps = {
  variant?: keyof typeof VARIANTS;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  children,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
};

export function ButtonLink({ href, variant = "primary", children }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]}`}>
      {children}
    </Link>
  );
}
