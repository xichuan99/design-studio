'use client';

import React, { useState, useEffect } from 'react';
import { useProjectApi, CopywritingVariation } from '@/lib/api';
import { Loader2, Sparkles, RefreshCw, X, Check } from 'lucide-react';

interface Question {
    id: string;
    question: string;
    type: string;
    options?: string[];
    default?: string;
}

interface CopywritingPanelProps {
    productDescription: string;
    activeBrandKitName?: string;
    onSelectCopy: (fullText: string) => void;
    onClose: () => void;
}

const TONES = [
    { id: 'persuasive', label: 'Persuasif' },
    { id: 'casual', label: 'Kasual' },
    { id: 'professional', label: 'Profesional' },
    { id: 'funny', label: 'Lucu' },
];

export default function CopywritingPanel({
    productDescription,
    activeBrandKitName,
    onSelectCopy,
    onClose
}: CopywritingPanelProps) {
    const api = useProjectApi();
    
    const [step, setStep] = useState<'clarify' | 'generate'>('clarify');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Clarify state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    // Generate state
    const [tone, setTone] = useState<string>('persuasive');
    const [variations, setVariations] = useState<CopywritingVariation[]>([]);

    useEffect(() => {
        // Step 1: Clarify
        const clarify = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.clarifyCopywriting({ product_description: productDescription });
                setQuestions(res.questions || []);
                
                // We no longer set default answers here so that the inputs remain empty
                // and the placeholder (which contains the examples) is visible instead.
                setAnswers({});
                
                if (!res.questions || res.questions.length === 0) {
                    // Fallback to directly generate if no questions
                    fetchVariations({}, tone);
                } else {
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                console.error("Clarify error:", err);
                const errorMessage = err instanceof Error ? err.message : "Gagal memuat pertanyaan.";
                // On error, let the user skip 
                setError(errorMessage);
                setIsLoading(false);
            }
        };
        clarify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productDescription]);

    const handleAnswerChange = (id: string, val: string) => {
        setAnswers(prev => ({ ...prev, [id]: val }));
    };

    const fetchVariations = async (answersToUse = answers, toneToUse = tone) => {
        setStep('generate');
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.generateCopywriting({
                product_description: productDescription,
                tone: toneToUse,
                brand_name: activeBrandKitName,
                clarification_answers: answersToUse
            });
            setVariations(res.variations || []);
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Gagal menghasilkan copywriting.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitInterview = () => {
        fetchVariations(answers, tone);
    };

    const handleSkipInterview = () => {
        // Provide empty answers
        fetchVariations({}, tone);
    };

    const handleCopySelect = (fullText: string) => {
        onSelectCopy(fullText);
        onClose();
    };

    // Rendering parts
    const renderLoader = (message: string) => (
        <div className="flex flex-col items-center justify-center p-8 text-neutral-400">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-sm">{message}</p>
        </div>
    );

    const renderClarifyStep = () => {
        if (isLoading) return renderLoader("AI sedang menganalisis deskripsi Anda...");
        
        return (
            <div className="space-y-4">
                {error && <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-xl">{error}</div>}
                <div className="mb-2">
                    <h4 className="text-sm font-semibold text-white">Pertanyaan Cepat (Opsional)</h4>
                    <p className="text-xs text-neutral-400">Jawab ini untuk hasil yang lebih spesifik.</p>
                </div>
                
                {questions.map(q => (
                    <div key={q.id} className="space-y-2">
                        <label className="text-xs font-medium text-neutral-300 block">{q.question}</label>
                        {q.type === 'choice' && q.options ? (
                            <select
                                className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                value={answers[q.id] || ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            >
                                <option value="" disabled>Pilih...</option>
                                {q.options.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                value={answers[q.id] || ''}
                                placeholder={q.default || "Ketik manual..."}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        )}
                    </div>
                ))}

                <div className="flex justify-end gap-2 pt-2">
                    <button 
                        onClick={handleSkipInterview}
                        className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                        Langsung Generate
                    </button>
                    <button
                        onClick={handleSubmitInterview}
                        className="px-4 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Lanjut Generate
                    </button>
                </div>
            </div>
        );
    };

    const renderGenerateStep = () => {
        if (isLoading) return renderLoader("AI sedang merangkai kata-kata ajaib...");

        return (
            <div className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-900/50 border border-red-500/30 rounded-xl flex flex-col gap-3">
                        <p className="text-red-200 text-sm">{error}</p>
                        <button 
                            onClick={() => fetchVariations(answers, tone)}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1.5 rounded-lg text-xs font-medium self-start transition-colors"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}
                
                {/* Tone Selector */}
                {!error && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <span className="text-xs text-neutral-400 shrink-0 mr-1">Tone:</span>
                        {TONES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setTone(t.id); fetchVariations(answers, t.id); }}
                                className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-all ${
                                    tone === t.id 
                                        ? 'bg-primary/20 border-primary text-primary font-medium' 
                                        : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-400 hover:text-white'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Variations */}
                <div className="grid gap-3">
                    {variations.map((v, i) => (
                        <div key={i} className="group relative bg-neutral-900/50 border border-neutral-700/50 rounded-xl p-3 hover:border-primary/30 transition-all">
                            <span className="inline-block px-2 py-0.5 mb-2 bg-neutral-800 text-neutral-300 text-[10px] font-mono uppercase tracking-wider rounded">
                                {v.style}
                            </span>
                            <h5 className="font-bold text-sm text-white leading-snug mb-1 pr-8">{v.headline}</h5>
                            <p className="text-xs text-neutral-300 leading-relaxed mb-2">{v.subline}</p>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-primary/80">{v.cta}</p>
                                <button 
                                    onClick={() => handleCopySelect(v.full_text)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary text-[11px] font-medium rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Pakai Teks Ini"
                                >
                                    <Check className="w-3.5 h-3.5" /> Pakai
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {!error && (
                    <div className="flex justify-center pt-2 border-t border-neutral-800/50">
                        <button 
                            onClick={() => fetchVariations()}
                            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Re-generate
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="relative mt-3 p-4 bg-neutral-900 border border-primary/20 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-200 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-medium text-sm text-white">AI Copywriting</h3>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {step === 'clarify' ? renderClarifyStep() : renderGenerateStep()}
        </div>
    );
}
