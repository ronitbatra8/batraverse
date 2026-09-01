import { cn } from "@/lib/utils";

export default function Skeleton({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md",
        light ? "bg-dark-200/70" : "bg-white/10",
        className
      )}
    />
  );
}