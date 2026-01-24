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
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon className={cn('w-5 h-5', iconColorClass)} />
        {title}
      </h2>
      <div
        className={cn(
          'grid gap-4',
          columns === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {children}
      </div>
    </section>
  );
});

StatSection.displayName = 'StatSection';
