import { cn } from "@/lib/formatters";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({
  title,
  subtitle,
  action,
  noPadding = false,
  children,
  className,
  ...props
}: CardProps) {
  const hasHeader = title || subtitle || action;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-neutral-200 shadow-sm",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-neutral-100">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-neutral-900 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="ml-4 flex-shrink-0">{action}</div>
          )}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}
