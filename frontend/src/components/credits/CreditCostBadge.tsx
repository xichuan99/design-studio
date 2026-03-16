import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CreditCostBadgeProps {
  cost: number;
  className?: string;
  showTooltip?: boolean;
}

export function CreditCostBadge({ cost, className, showTooltip = true }: CreditCostBadgeProps) {
  const badgeContent = (
    <div 
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        "bg-amber-100 text-amber-700 shadow-sm border border-amber-200/50",
        "dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/50",
        className
      )}
    >
      <Zap className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
      <span>{cost}</span>
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Operasi ini membutuhkan <strong>{cost} kredit</strong></p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
