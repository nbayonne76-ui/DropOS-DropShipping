import { cn } from "@/lib/formatters";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-neutral-900 truncate">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 flex-shrink-0">{action}</div>
      )}
    </div>
  );
}
