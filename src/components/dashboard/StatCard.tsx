import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatVariant = 'quantity' | 'published' | 'submissions' | 'average';

// 60-30-10 Color System:
// Blue (Primary) - Quantity/Total counts
// Green (Success) - Published/Active status
// Amber/Yellow - Submissions/Attempts
// Orange - Averages/Performance metrics
const variantStyles: Record<StatVariant, { 
  iconBg: string; 
  iconText: string; 
  ring: string;
  accent: string;
}> = {
  quantity: {
    iconBg: 'bg-primary/15',
    iconText: 'text-primary',
    ring: 'ring-primary/30',
    accent: 'border-l-primary',
  },
  published: {
    iconBg: 'bg-success/15',
    iconText: 'text-success',
    ring: 'ring-success/30',
    accent: 'border-l-success',
  },
  submissions: {
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-500',
    ring: 'ring-amber-500/30',
    accent: 'border-l-amber-500',
  },
  average: {
    iconBg: 'bg-orange-500/15',
    iconText: 'text-orange-600 dark:text-orange-500',
    ring: 'ring-orange-500/30',
    accent: 'border-l-orange-500',
  },
};

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  variant: StatVariant;
  showGauge?: boolean;
  gaugeValue?: number;
  suffix?: string;
}

export const StatCard = memo(({
  icon: Icon,
  value,
  label,
  variant,
  showGauge = false,
  gaugeValue = 0,
  suffix,
}: StatCardProps) => {
  const styles = variantStyles[variant];
  const isZero = value === 0 || value === '0' || value === '0%';
  const displayValue = isZero ? '—' : value;

  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'shadow-sm hover:shadow-md',
        'border-l-4',
        isZero ? 'border-l-muted-foreground/20' : styles.accent
      )}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-4">
          {/* Icon Container */}
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              'ring-1 shadow-sm',
              isZero ? 'bg-muted/50 text-muted-foreground ring-border/50' : styles.iconBg,
              isZero ? '' : styles.iconText,
              isZero ? '' : styles.ring
            )}
          >
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p
                className={cn(
                  'text-2xl font-extrabold tracking-tight',
                  isZero ? 'text-muted-foreground/60' : 'text-foreground'
                )}
              >
                {displayValue}
              </p>
              {suffix && !isZero && (
                <span className="text-base font-semibold text-muted-foreground">
                  {suffix}
                </span>
              )}
            </div>
            <p className={cn(
              'text-sm truncate',
              isZero ? 'text-muted-foreground/60' : 'text-muted-foreground font-medium'
            )}>
              {label}
            </p>
            {isZero && (
              <p className="text-xs text-muted-foreground/50 mt-0.5 italic">
                Chưa có dữ liệu
              </p>
            )}
          </div>

          {/* Mini Gauge for averages */}
          {showGauge && !isZero && (
            <div className="shrink-0">
              <MiniGauge value={gaugeValue} variant={variant} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// Mini circular gauge component with gradient effect
const MiniGauge = memo(({ value, variant }: { value: number; variant: StatVariant }) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  // Determine gauge color based on performance thresholds
  const getGaugeColor = () => {
    if (normalizedValue >= 70) return 'stroke-success';
    if (normalizedValue >= 50) return 'stroke-amber-500';
    return 'stroke-orange-500';
  };

  const getGaugeBg = () => {
    if (normalizedValue >= 70) return 'bg-success/10';
    if (normalizedValue >= 50) return 'bg-amber-500/10';
    return 'bg-orange-500/10';
  };

  return (
    <div className={cn(
      'relative w-14 h-14 rounded-full',
      getGaugeBg()
    )}>
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
        {/* Background circle */}
        <circle
          cx="22"
          cy="22"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-border/50"
        />
        {/* Progress circle */}
        <circle
          cx="22"
          cy="22"
          r="16"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={cn(getGaugeColor(), 'drop-shadow-sm')}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.6s ease-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">
          {Math.round(normalizedValue)}
        </span>
      </div>
    </div>
  );
});

MiniGauge.displayName = 'MiniGauge';
