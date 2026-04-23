'use client';

import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Tools that support the Ultra quality toggle.
 * Non-generative tools (upscale, retouch, id_photo, watermark) are excluded.
 */
export const ULTRA_SUPPORTED_TOOLS = new Set([
  'background_swap',
  'product_scene',
  'generative_expand',
  'magic_eraser',
]);

interface QualityToggleProps {
  value: 'standard' | 'ultra';
  onChange: (value: 'standard' | 'ultra') => void;
  standardCost: number;
  /** Defaults to 2× standardCost */
  ultraCost?: number;
  disabled?: boolean;
  className?: string;
}

export function QualityToggle({
  value,
  onChange,
  standardCost,
  ultraCost,
  disabled = false,
  className,
}: QualityToggleProps) {
  const ultraPrice = ultraCost ?? standardCost * 2;
  const isUltra = value === 'ultra';

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <span className="text-xs font-medium text-muted-foreground">Kualitas Model</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {/* Standard */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('standard')}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors',
              !isUltra
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="font-medium">Standard</span>
            <span className="opacity-75">{standardCost} kredit</span>
          </button>

          {/* Ultra */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange('ultra')}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors border-l border-border',
                  isUltra
                    ? 'bg-gradient-to-b from-violet-600 to-violet-700 text-white'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-medium">Ultra ✨</span>
                <span className="opacity-75">{ultraPrice} kredit</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-center text-xs">
              Ultra menggunakan <strong>gpt-image-2</strong> — kualitas teks & detail terbaik.
              2× kredit dibanding Standard.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
