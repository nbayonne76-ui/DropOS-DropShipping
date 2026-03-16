import { cn } from "@/lib/formatters";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-success-50 text-success-700 border-success-200",
  warning: "bg-warning-50 text-warning-700 border-warning-200",
  danger: "bg-danger-50 text-danger-700 border-danger-200",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  info: "bg-primary-50 text-primary-700 border-primary-200",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  neutral: "bg-neutral-400",
  info: "bg-primary-500",
};

export function Badge({
  variant = "neutral",
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
