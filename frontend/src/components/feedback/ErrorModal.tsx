import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Coins, AlertTriangle, CheckCircle2 } from "lucide-react";

export type ErrorModalType = 'safety' | 'credits' | 'system';

interface ErrorModalProps {
    open: boolean;
    onClose: () => void;
    type: ErrorModalType;
    title?: string;
    description?: string;
    onAction?: () => void;
    actionLabel?: string;
}

export function ErrorModal({
    open,
    onClose,
    type,
    title,
    description,
    onAction,
    actionLabel
}: ErrorModalProps) {
    
    const config = {
        safety: {
            icon: <ShieldAlert className="w-10 h-10 text-amber-500" />,
            defaultTitle: "Prompt Tidak Dapat Diproses",
            defaultDesc: "Desain ditolak oleh sistem keamanan AI karena berpotensi mengandung unsur yang dilindungi hak cipta atau konten sensitif lainnya. Mohon ubah deskripsi Anda menggunakan kata-kata yang lebih umum.",
            defaultAction: "Ubah Deskripsi",
            iconBg: "bg-amber-100 dark:bg-amber-900/30",
        },
        credits: {
            icon: <Coins className="w-10 h-10 text-indigo-500" />,
            defaultTitle: "Kredit Tidak Mencukupi",
            defaultDesc: "Kredit Anda telah habis. Anda memerlukan kredit untuk melakukan generasi AI.",
            defaultAction: "Lihat Paket Kredit",
            iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
        },
        system: {
            icon: <AlertTriangle className="w-10 h-10 text-destructive" />,
            defaultTitle: "Terjadi Kesalahan Sistem",
            defaultDesc: "Kami mengalami kendala saat memproses permintaan Anda. Silakan coba beberapa saat lagi.",
            defaultAction: "Coba Lagi",
            iconBg: "bg-destructive/10",
        }
    };

    const currentConfig = config[type];

    // Jika ini adalah error generation (yang me-refund kredit), tampilkan badge info
    const isGenerationError = type === 'safety' || type === 'system';

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md text-center p-6 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${currentConfig.iconBg}`}>
                    {currentConfig.icon}
                </div>
                
                <DialogHeader className="w-full">
                    <DialogTitle className="text-xl font-bold mb-2 text-center">
                        {title || currentConfig.defaultTitle}
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground text-center">
                        {description || currentConfig.defaultDesc}
                    </DialogDescription>
                </DialogHeader>

                {isGenerationError && (
                    <div className="w-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-3 mt-4 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                        <span className="text-sm font-medium leading-none text-green-700 dark:text-green-400">
                            Kredit Anda telah dikembalikan otomatis.
                        </span>
                    </div>
                )}

                <DialogFooter className="w-full sm:justify-center mt-6 flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                        Kembali
                    </Button>
                    {onAction && (
                        <Button 
                            className="w-full sm:w-auto" 
                            variant={type === 'system' ? 'destructive' : 'default'}
                            onClick={onAction}
                        >
                            {actionLabel || currentConfig.defaultAction}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
