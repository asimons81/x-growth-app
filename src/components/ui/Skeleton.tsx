import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

export function Skeleton({ height, width, rounded = "rounded-xl", className = "", style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("bg-ui-surface-elevated animate-pulse", rounded, className)}
      style={{
        height: height ?? undefined,
        width: width ?? undefined,
        minHeight: height ?? "1rem",
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("bg-ui-surface border border-ui-border rounded-2xl p-6 space-y-4", className)}>
      <Skeleton height={24} width="60%" />
      <div className="space-y-2">
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="40%" />
      </div>
    </div>
  );
}
