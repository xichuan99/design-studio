import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CarouselBrandTokens, CarouselSlide } from '@/lib/api';


interface InstagramCarouselPreviewProps {
    slides: CarouselSlide[];
    activeIndex: number;
    brandName: string;
    igHandle?: string;
    tokens: CarouselBrandTokens;
    onSelect: (index: number) => void;
}


const LIGHT_TYPES = new Set(['hero', 'features', 'how_to', 'proof']);
const GRADIENT_TYPES = new Set(['solution', 'cta', 'offer']);


function getBackgroundStyle(type: string, tokens: CarouselBrandTokens) {
    if (GRADIENT_TYPES.has(type)) {
        return {
            backgroundImage: `linear-gradient(165deg, ${tokens.dark} 0%, ${tokens.primary} 48%, ${tokens.light} 100%)`,
            color: '#ffffff',
        };
    }

    if (LIGHT_TYPES.has(type)) {
        return { backgroundColor: tokens.light_bg, color: tokens.dark };
    }

    return { backgroundColor: tokens.dark_bg, color: '#ffffff' };
}


export function InstagramCarouselPreview({
    slides,
    activeIndex,
    brandName,
    igHandle,
    tokens,
    onSelect,
}: InstagramCarouselPreviewProps) {
    const activeSlide = slides[activeIndex];
    const isLastSlide = activeIndex === slides.length - 1;
    const backgroundStyle = getBackgroundStyle(activeSlide.type, tokens);

    return (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Preview</p>
                    <h3 className="mt-1 text-xl font-bold text-foreground">Instagram Frame</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => onSelect(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => onSelect(Math.min(slides.length - 1, activeIndex + 1))} disabled={isLastSlide}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="mx-auto flex aspect-[4/5] w-full max-w-[420px] flex-col overflow-hidden rounded-[32px] border border-border/50 shadow-xl" style={backgroundStyle}>
                <div className="flex items-center justify-between px-8 py-6 text-xs font-semibold uppercase tracking-[0.18em] opacity-90">
                    <span>{brandName}</span>
                    <span>{igHandle || '@brand'}</span>
                </div>
                <div className="px-8 pb-8 pt-4">
                    <div className="inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: tokens.primary, color: tokens.primary }}>
                        {activeSlide.type.replace('_', ' ')}
                    </div>
                    <h4 className="mt-6 text-3xl font-bold leading-tight">{activeSlide.headline}</h4>
                    <p className="mt-4 text-sm leading-6 opacity-90">{activeSlide.body}</p>
                </div>
                <div className="mt-auto px-8 pb-10">
                    {activeSlide.cta && (
                        <div className="mb-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: tokens.primary }}>
                            {activeSlide.cta}
                        </div>
                    )}
                    <div className="h-2 rounded-full bg-white/20">
                        <div className="h-2 rounded-full" style={{ width: `${((activeIndex + 1) / slides.length) * 100}%`, backgroundColor: tokens.primary }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-medium opacity-80">
                        <span>Slide {activeIndex + 1}</span>
                        <span>{slides.length} total</span>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-7">
                {slides.map((slide, index) => (
                    <button
                        key={`${slide.index}-${slide.type}`}
                        type="button"
                        onClick={() => onSelect(index)}
                        className={`rounded-2xl border px-3 py-3 text-left transition-colors ${index === activeIndex ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted'}`}
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{slide.index}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">{slide.headline}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}