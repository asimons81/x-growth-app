import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "indigo" | "purple" | "cyan";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45]",
  success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border border-red-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
