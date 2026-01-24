import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type QuickLinkVariant = 'primary' | 'success' | 'warning' | 'amber';

const variantStyles: Record<QuickLinkVariant, { bg: string; text: string }> = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
  },
  warning: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
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
        'hover:shadow-md hover:-translate-y-0.5',
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
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              styles.bg,
              styles.text
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {title}
            </CardTitle>
            <CardDescription className="text-sm truncate">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});

QuickLinkCard.displayName = 'QuickLinkCard';
