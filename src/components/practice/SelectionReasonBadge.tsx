import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Target, 
  Clock, 
  TrendingUp, 
  RotateCcw, 
  AlertCircle, 
  Zap, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelectionReason, SelectionReasonType } from '@/hooks/useAdaptiveQuestionSelection';

interface SelectionReasonBadgeProps {
  reason: SelectionReason;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

const reasonConfig: Record<SelectionReasonType, { 
  icon: React.ElementType; 
  className: string;
}> = {
  weak_point: { 
    icon: Target, 
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
  },
  spaced_repetition: { 
    icon: Clock, 
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
  },
  difficulty_match: { 
    icon: TrendingUp, 
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
  },
  retry_failed: { 
    icon: RotateCcw, 
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
  },
  struggling_topic: { 
    icon: AlertCircle, 
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
  },
  challenge: { 
    icon: Zap, 
    className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
  },
  new_topic: { 
    icon: Sparkles, 
    className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800'
  },
  reinforce: { 
    icon: BookOpen, 
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
  }
};

export function SelectionReasonBadge({ reason, showTooltip = true, size = 'md' }: SelectionReasonBadgeProps) {
  const config = reasonConfig[reason.type];
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 border font-medium transition-all',
        config.className,
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span>{reason.label}</span>
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{reason.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SelectionReasonsDisplayProps {
  reasons: SelectionReason[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
}

export function SelectionReasonsDisplay({ reasons, maxDisplay = 2, size = 'md' }: SelectionReasonsDisplayProps) {
  const displayReasons = reasons.slice(0, maxDisplay);
  const remainingCount = reasons.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayReasons.map((reason, index) => (
        <SelectionReasonBadge key={`${reason.type}-${index}`} reason={reason} size={size} />
      ))}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={cn(size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1')}>
                +{remainingCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                {reasons.slice(maxDisplay).map((reason, index) => (
                  <p key={index} className="text-sm">
                    <strong>{reason.label}:</strong> {reason.description}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
