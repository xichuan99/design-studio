import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCredits } from '@/hooks/useCredits';
import { Zap, AlertCircle } from 'lucide-react';

interface CreditConfirmDialogProps {
  cost: number;
  title: string;
  description: string;
  onConfirm: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function CreditConfirmDialog({ 
  cost, 
  title, 
  description, 
  onConfirm, 
  children,
  disabled = false
}: CreditConfirmDialogProps) {
  const { creditsRemaining } = useCredits();
  const hasEnoughCredits = creditsRemaining !== null && creditsRemaining >= cost;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-lg my-2 flex justify-between items-center border">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">Biaya Operasi</span>
            <span className="text-lg font-bold flex items-center gap-1 text-amber-500">
              <Zap className="h-4 w-4 fill-current" />
              {cost} Kredit
            </span>
          </div>
          
          <div className="h-10 w-px bg-border mx-4" />
          
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-muted-foreground">Sisa Kredit Anda</span>
            <span className={`text-lg font-bold flex items-center gap-1 ${hasEnoughCredits ? 'text-primary' : 'text-destructive'}`}>
               <Zap className="h-4 w-4 fill-current" />
              {creditsRemaining ?? '--'} Kredit
            </span>
          </div>
        </div>

        {!hasEnoughCredits && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>Kredit Anda tidak mencukupi untuk melakukan operasi ini. Silakan upgrade paket atau tunggu reset harian (jika Anda pengguna berbayar).</p>
          </div>
        )}

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={!hasEnoughCredits}
            className="flex items-center gap-2"
          >
            Lanjutkan <Zap className="h-3.5 w-3.5 fill-current" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
