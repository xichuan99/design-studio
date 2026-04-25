import { ArrowLeft, Download, Loader2, PenSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultActionCardProps {
    title?: string;
    description?: string;
    onContinue: () => void;
    onDownload: () => void;
    onRetry: () => void;
    onBack: () => void;
    continueLabel?: string;
    downloadLabel?: string;
    retryLabel?: string;
    backLabel?: string;
    continueLoading?: boolean;
}

export function ResultActionCard({
    title = "Lanjutkan hasil ini",
    description = "Pilih langkah berikutnya: teruskan ke editor, simpan hasil, ulangi proses, atau kembali ke daftar tools.",
    onContinue,
    onDownload,
    onRetry,
    onBack,
    continueLabel = "Lanjut ke Editor",
    downloadLabel = "Download Hasil",
    retryLabel = "Coba Lagi",
    backLabel = "Kembali ke Tools",
    continueLoading = false,
}: ResultActionCardProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-center">
                <h4 className="text-lg font-semibold text-foreground">{title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button size="lg" className="gap-2 font-bold shadow-md" disabled={continueLoading} onClick={onContinue}>
                    {continueLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenSquare className="w-5 h-5" />} {continueLabel}
                </Button>
                <Button size="lg" variant="outline" className="gap-2" onClick={onDownload}>
                    <Download className="w-5 h-5" /> {downloadLabel}
                </Button>
                <Button size="lg" variant="secondary" className="gap-2" onClick={onRetry}>
                    <RotateCcw className="w-5 h-5" /> {retryLabel}
                </Button>
                <Button size="lg" variant="ghost" className="gap-2" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" /> {backLabel}
                </Button>
            </div>
        </div>
    );
}