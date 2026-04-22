import React, { useState, useEffect } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

const PHASES = [
    { text: "Menyiapkan prompt visual...", duration: 2500 },
    { text: "Menganalisis elemen & struktur...", duration: 3500 },
    { text: "Merender gambar resolusi tinggi...", duration: 6000 },
    { text: "Finalisasi warna dan detail...", duration: 3000 },
    { text: "Sedikit lagi selesai...", duration: 3000 }
];

export function GenerationProgress() {
    const [progress, setProgress] = useState(0);
    const [phaseIndex, setPhaseIndex] = useState(0);

    const completedPhases = PHASES.filter((_, index) => index < phaseIndex);
    const currentPhase = PHASES[phaseIndex]?.text || PHASES[PHASES.length - 1].text;

    // Simulate smooth progress up to 98%
    useEffect(() => {
        let currentProgress = 0;
        const totalDuration = 15000; // Expected roughly ~15 seconds 
        const intervalTime = 100;
        const increment = (100 / (totalDuration / intervalTime));

        const timer = setInterval(() => {
            currentProgress = Math.min(currentProgress + increment, 98); 
            setProgress(currentProgress);
        }, intervalTime);

        return () => clearInterval(timer);
    }, []);

    // Cycle through text phases
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const scheduleNextPhase = (index: number) => {
            if (index < PHASES.length - 1) {
                timeout = setTimeout(() => {
                    setPhaseIndex(index + 1);
                    scheduleNextPhase(index + 1);
                }, PHASES[index].duration);
            }
        };
        scheduleNextPhase(0);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="max-w-2xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in p-4">
            <div className="text-center mb-10 space-y-5">
                <div className="inline-flex relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="w-24 h-24 bg-primary/5 backdrop-blur-md border border-primary/20 rounded-2xl shadow-[0_0_40px_rgba(var(--primary),0.15)] flex items-center justify-center relative z-10 transition-transform hover:scale-105">
                        <Sparkles className="w-12 h-12 text-primary animate-pulse drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">AI Sedang Menggambar ✨</h2>
                <p className="text-muted-foreground animate-pulse text-lg">
                    {currentPhase}
                </p>
                <p className="text-sm text-muted-foreground/80">
                    Setelah langkah ini selesai, Anda akan masuk ke tahap review untuk memilih hasil terbaik.
                </p>
            </div>

            {/* Smooth simulated progress bar */}
            <div className="w-full max-w-lg mb-4 bg-muted/40 rounded-full h-2.5 overflow-hidden border border-border/20 backdrop-blur-sm shadow-inner relative">
                <div 
                    className="absolute top-0 left-0 bg-gradient-to-r from-primary/70 via-primary to-primary/90 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(var(--primary),0.5)]" 
                    style={{ width: `${progress}%` }} 
                />
            </div>
            
            <div className="w-full max-w-lg space-y-3">
                <div className="flex items-center justify-between text-sm opacity-80 px-2">
                    <span className="flex items-center gap-2 font-medium">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" /> 
                        Generasi Gambar Flux
                    </span>
                    <span className="text-muted-foreground font-mono font-bold tracking-widest">{Math.floor(progress)}%</span>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/60 p-4 text-left shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Progress Saat Ini</p>
                    <ul className="mt-3 space-y-2">
                        {completedPhases.map((phase) => (
                            <li key={phase.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>{phase.text}</span>
                            </li>
                        ))}
                        <li className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>{currentPhase}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
