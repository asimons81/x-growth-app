import { ReactNode } from "react";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-ui-border/50">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-main">{title}</h1>
          {description && <p className="text-sm font-medium text-text-subtle mt-1">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {action}
        <DarkModeToggle />
      </div>
    </div>
  );
}
