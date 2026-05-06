import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md pb-6 outline-none">
                <DialogHeader>
                    <DialogTitle className="font-semibold text-xl">Pintasan Keyboard</DialogTitle>
                    <DialogDescription>
                        Gunakan pintasan ini untuk bekerja lebih efisien.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                    <div className="flex flex-col gap-3 border bg-muted/30 p-4 rounded-xl shadow-sm">
                        <ShortcutRow label="Hapus Elemen" keys={['Del', '/', 'Backspace']} />
                        <ShortcutRow label="Undo" keys={['Ctrl', '+', 'Z']} />
                        <ShortcutRow label="Redo" keys={['Ctrl', '+', 'Shift', '+', 'Z']} />
                        <ShortcutRow label="Duplikasi Elemen" keys={['Ctrl', '+', 'D']} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ShortcutRow({ label, keys }: { label: string, keys: string[] }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <div className="flex items-center gap-1.5">
                {keys.map((key, i) => {
                    if (key === '+' || key === '/') {
                        return <span key={i} className="text-xs text-muted-foreground font-medium">{key}</span>;
                    }
                    return (
                        <kbd key={i} className="px-2 py-0.5 bg-background border border-border/80 shadow-[0_1px_1px_rgba(0,0,0,0.05)] text-xs font-semibold text-muted-foreground rounded-md uppercase tracking-wider">
                            {key}
                        </kbd>
                    );
                })}
            </div>
        </div>
    );
}
