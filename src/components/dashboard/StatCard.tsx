import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatVariant = 'quantity' | 'published' | 'submissions' | 'average';

const variantStyles: Record<StatVariant, { bg: string; text: string; ring: string }> = {
  quantity: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
  published: {
    bg: 'bg-success/10',
    text: 'text-success',
    ring: 'ring-success/20',
  },
  submissions: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    ring: 'ring-amber-500/20',
  },
  average: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    ring: 'ring-orange-500/20',
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
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ring-1',
              isZero ? 'bg-muted text-muted-foreground ring-border' : styles.bg,
              isZero ? '' : styles.text,
              isZero ? '' : styles.ring
            )}
          >
            <Icon className="w-6 h-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <p
                className={cn(
                  'text-2xl font-bold tracking-tight',
                  isZero ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {displayValue}
              </p>
              {suffix && !isZero && (
                <span className="text-lg font-medium text-muted-foreground">
                  {suffix}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            {isZero && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
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

// Mini circular gauge component
const MiniGauge = memo(({ value, variant }: { value: number; variant: StatVariant }) => {
  const styles = variantStyles[variant];
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  // Determine gauge color based on value
  const getGaugeColor = () => {
    if (normalizedValue >= 70) return 'stroke-success';
    if (normalizedValue >= 50) return 'stroke-amber-500';
    return 'stroke-orange-500';
  };

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        {/* Background circle */}
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={getGaugeColor()}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-foreground">
          {Math.round(normalizedValue)}
        </span>
      </div>
    </div>
  );
});

MiniGauge.displayName = 'MiniGauge';
