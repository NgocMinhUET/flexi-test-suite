import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuickLinkVariant = 'primary' | 'success' | 'warning' | 'amber';

// Consistent icon styling with deeper, more saturated colors
const variantStyles: Record<QuickLinkVariant, { 
  iconBg: string; 
  iconText: string;
  hoverBorder: string;
}> = {
  primary: {
    iconBg: 'bg-primary/15',
    iconText: 'text-primary',
    hoverBorder: 'hover:border-primary/40',
  },
  success: {
    iconBg: 'bg-success/15',
    iconText: 'text-success',
    hoverBorder: 'hover:border-success/40',
  },
  warning: {
    iconBg: 'bg-orange-500/15',
    iconText: 'text-orange-600 dark:text-orange-500',
    hoverBorder: 'hover:border-orange-500/40',
  },
  amber: {
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-500',
    hoverBorder: 'hover:border-amber-500/40',
  },
};

interface QuickLinkCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  variant: QuickLinkVariant;
  onClick: () => void;
}

export const QuickLinkCard = memo(({
  icon: Icon,
  title,
  description,
  variant,
  onClick,
}: QuickLinkCardProps) => {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        'shadow-sm hover:shadow-md hover:-translate-y-0.5',
        'border border-border/60',
        styles.hoverBorder,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              'ring-1 ring-inset ring-black/5 shadow-sm',
              styles.iconBg,
              styles.iconText
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-bold text-foreground truncate">
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground truncate">
              {description}
            </CardDescription>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        </div>
      </CardHeader>
    </Card>
  );
});

QuickLinkCard.displayName = 'QuickLinkCard';
