import { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatSectionProps {
  icon: React.ElementType;
  title: string;
  iconColorClass?: string;
  children: ReactNode;
  columns?: 3 | 4;
}

export const StatSection = memo(({
  icon: Icon,
  title,
  iconColorClass = 'text-primary',
  children,
  columns = 4,
}: StatSectionProps) => {
  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          'bg-muted/50 ring-1 ring-border/50'
        )}>
          <Icon className={cn('w-4 h-4', iconColorClass)} />
        </div>
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          {title}
        </h2>
      </div>
      
      {/* Stats Grid */}
      <div
        className={cn(
          'grid gap-4',
          columns === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-3'
        )}
      >
        {children}
      </div>
    </section>
  );
});

StatSection.displayName = 'StatSection';
