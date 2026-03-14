import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Send } from "lucide-react";
import { BriefQuestion } from "@/app/create/types";
import { Textarea } from "@/components/ui/textarea";

interface DesignBriefInterviewProps {
    questions: BriefQuestion[];
    onComplete: (answers: Record<string, string>) => void;
    onSkip: () => void;
    isGeneratingPrompt: boolean;
}

export function DesignBriefInterview({
    questions,
    onComplete,
    onSkip,
    isGeneratingPrompt
}: DesignBriefInterviewProps) {
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Set default answers on mount
    React.useEffect(() => {
        const initialAnswers: Record<string, string> = {};
        questions.forEach(q => {
            if (q.default) {
                initialAnswers[q.id] = q.default;
            }
        });
        setAnswers(initialAnswers);
    }, [questions]);

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    return (
        <div className="flex flex-col w-full mx-auto animation-fade-in gap-5 max-w-3xl pb-20">
            <div className="text-center space-y-3 mb-4">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
                    <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Mari Perjelas Visi Anda
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    Bantu AI memahami gaya desain yang Anda inginkan dengan menjawab beberapa pertanyaan singkat ini.
                </p>
            </div>

            <div className="space-y-6">
                {questions.map((q, index) => (
                    <div key={q.id} className="bg-card border shadow-sm rounded-xl p-5 md:p-6 animation-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <h3 className="text-base font-semibold mb-3 flex items-start gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                                {index + 1}
                            </span>
                            {q.question}
                        </h3>
                        
                        {q.type === 'choice' && q.options && (
                            <div className="flex flex-wrap gap-2 ml-8">
                                {q.options.map((opt) => (
                                    <Button
                                        key={opt}
                                        type="button"
                                        variant={answers[q.id] === opt ? "default" : "outline"}
                                        className={`rounded-full px-4 text-sm font-medium transition-all ${
                                            answers[q.id] === opt 
                                            ? "shadow-md bg-primary text-primary-foreground hover:bg-primary/90" 
                                            : "hover:bg-primary/5 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                                        }`}
                                        onClick={() => handleAnswer(q.id, opt)}
                                        disabled={isGeneratingPrompt}
                                    >
                                        {opt}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {q.type === 'text' && (
                            <div className="ml-8">
                                <Textarea 
                                    placeholder="Ketik jawaban Anda di sini..."
                                    value={answers[q.id] || ""}
                                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                                    className="max-w-md bg-background dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary placeholder:text-muted-foreground resize-none"
                                    rows={2}
                                    disabled={isGeneratingPrompt}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row-reverse items-center justify-center gap-4 border-t pt-8">
                <Button 
                    size="lg" 
                    className="w-full sm:w-auto min-w-[200px] h-12 shadow-lg hover:shadow-xl transition-all"
                    onClick={() => onComplete(answers)}
                    disabled={isGeneratingPrompt}
                >
                    {isGeneratingPrompt ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Meracik Prompt...</>
                    ) : (
                        <><Send className="w-4 h-4 mr-2" /> Buat Prompt AI</>
                    )}
                </Button>
                
                <Button 
                    size="lg" 
                    variant="ghost" 
                    className="w-full sm:w-auto h-12 text-muted-foreground hover:text-foreground"
                    onClick={onSkip}
                    disabled={isGeneratingPrompt}
                >
                    Lewati (Gunakan AI Bebas)
                </Button>
            </div>
        </div>
    );
}
