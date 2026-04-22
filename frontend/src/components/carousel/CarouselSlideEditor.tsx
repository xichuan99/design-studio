import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { CarouselSlide } from '@/lib/api';


interface CarouselSlideEditorProps {
    slide: CarouselSlide;
    instruction: string;
    isRegenerating: boolean;
    onSlideChange: (slide: CarouselSlide) => void;
    onInstructionChange: (value: string) => void;
    onRegenerate: () => void;
}


export function CarouselSlideEditor({
    slide,
    instruction,
    isRegenerating,
    onSlideChange,
    onInstructionChange,
    onRegenerate,
}: CarouselSlideEditorProps) {
    return (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Editor Slide</p>
                <h3 className="mt-1 text-xl font-bold text-foreground">Slide {slide.index}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Edit teks secara langsung atau minta AI mengganti satu slide ini tanpa mengulang seluruh carousel.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="carousel_headline">Headline</Label>
                    <Input id="carousel_headline" value={slide.headline} onChange={(event) => onSlideChange({ ...slide, headline: event.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="carousel_body">Body</Label>
                    <Textarea id="carousel_body" className="min-h-28" value={slide.body} onChange={(event) => onSlideChange({ ...slide, body: event.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="carousel_cta">CTA</Label>
                    <Input id="carousel_cta" value={slide.cta || ''} onChange={(event) => onSlideChange({ ...slide, cta: event.target.value || null })} placeholder="Opsional, biasanya untuk slide terakhir" />
                </div>
                <div className="space-y-2 rounded-2xl border border-dashed border-border/80 bg-background/60 p-4">
                    <Label htmlFor="carousel_instruction">Instruksi regenerasi slide</Label>
                    <Textarea id="carousel_instruction" className="min-h-24" value={instruction} onChange={(event) => onInstructionChange(event.target.value)} placeholder="Contoh: Bikin hook lebih tajam dan cocok untuk founder startup" />
                    <Button type="button" variant="outline" className="w-full" onClick={onRegenerate} disabled={isRegenerating}>
                        {isRegenerating ? 'Mengganti Slide...' : 'Regenerate Slide Ini'}
                    </Button>
                </div>
            </div>
        </div>
    );
}