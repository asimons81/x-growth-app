import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

export function Skeleton({ height, width, rounded = "rounded-lg", className = "", style, ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
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
    <div className={`glass-card p-6 space-y-3 ${className}`}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="40%" />
      <Skeleton height={14} width="80%" />
    </div>
  );
}
