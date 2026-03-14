import { AlertCircle, AlertTriangle, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineErrorBannerProps {
    message: string;
    type?: 'error' | 'warning';
    onDismiss?: () => void;
    onRetry?: () => void;
}

export function InlineErrorBanner({
    message,
    type = 'error',
    onDismiss,
    onRetry
}: InlineErrorBannerProps) {
    const isError = type === 'error';
    
    return (
        <div className={`relative w-full rounded-xl border-l-[4px] p-4 flex items-start gap-4 shadow-sm transition-all
            ${isError 
                ? 'bg-destructive/5 border-l-destructive/80 border-y-destructive/20 border-r-destructive/20' 
                : 'bg-amber-500/5 border-l-amber-500/80 border-y-amber-500/20 border-r-amber-500/20'
            }`}
        >
            <div className="shrink-0 mt-0.5">
                {isError ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className={`text-sm font-medium leading-relaxed ${isError ? 'text-destructive/90' : 'text-amber-700 dark:text-amber-500'}`}>
                    {message}
                </p>
                
                {onRetry && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className={`shrink-0 gap-1.5 h-8 font-medium bg-background
                            ${isError 
                                ? 'text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20' 
                                : 'text-amber-700 dark:text-amber-500 hover:bg-amber-500/10 border-amber-500/30'
                            }`}
                        onClick={onRetry}
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Coba Lagi
                    </Button>
                )}
            </div>

            {onDismiss && (
                <button 
                    onClick={onDismiss}
                    className={`absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/5 transition-colors
                        ${isError ? 'text-destructive/60 hover:text-destructive' : 'text-amber-600/60 hover:text-amber-600'}`}
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
