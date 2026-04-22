import type { ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { CarouselGenerateRequest } from '@/lib/api';


interface CarouselGeneratorFormProps {
    value: CarouselGenerateRequest;
    isSubmitting: boolean;
    onChange: (value: CarouselGenerateRequest) => void;
    onSubmit: () => void;
}


export function CarouselGeneratorForm({ value, isSubmitting, onChange, onSubmit }: CarouselGeneratorFormProps) {
    const updateField = (field: keyof CarouselGenerateRequest) => (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const nextValue = field === 'num_slides' ? Number(event.target.value) : event.target.value;
        onChange({ ...value, [field]: nextValue });
    };

    return (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Path C</p>
                <h2 className="mt-1 text-2xl font-bold text-foreground">Instagram Carousel Generator</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Mulai dari topik, brand, dan warna utama. AI akan menyusun carousel multi-slide yang siap ditinjau lalu diekspor ke ZIP.
                </p>
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="topic">Topik Carousel</Label>
                    <Textarea
                        id="topic"
                        value={value.topic}
                        onChange={updateField('topic')}
                        className="min-h-28"
                        placeholder="Contoh: 5 tips UX design untuk startup yang ingin onboarding lebih rapi"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="brand_name">Nama Brand</Label>
                        <Input id="brand_name" value={value.brand_name} onChange={updateField('brand_name')} placeholder="Contoh: DesignCo" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ig_handle">Handle Instagram</Label>
                        <Input id="ig_handle" value={value.ig_handle || ''} onChange={updateField('ig_handle')} placeholder="@designco.id" />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="primary_color">Warna Primer</Label>
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                            <input
                                id="primary_color"
                                type="color"
                                value={value.primary_color}
                                onChange={updateField('primary_color')}
                                className="h-10 w-14 rounded border-0 bg-transparent p-0"
                            />
                            <Input value={value.primary_color} onChange={updateField('primary_color')} className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tone">Tone</Label>
                        <select id="tone" value={value.tone} onChange={updateField('tone')} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                            <option value="professional">Professional</option>
                            <option value="friendly">Friendly</option>
                            <option value="bold">Bold</option>
                            <option value="educational">Educational</option>
                            <option value="playful">Playful</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="font_style">Gaya Font</Label>
                        <select id="font_style" value={value.font_style} onChange={updateField('font_style')} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                            <option value="modern">Modern</option>
                            <option value="editorial">Editorial</option>
                            <option value="warm">Warm</option>
                            <option value="technical">Technical</option>
                            <option value="expressive">Expressive</option>
                            <option value="classic">Classic</option>
                            <option value="rounded">Rounded</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="num_slides">Jumlah Slide</Label>
                    <Input id="num_slides" type="number" min={5} max={10} value={value.num_slides} onChange={updateField('num_slides')} />
                </div>
            </div>

            <Button className="mt-6 w-full" onClick={onSubmit} disabled={isSubmitting || value.topic.trim().length < 8 || value.brand_name.trim().length < 2}>
                {isSubmitting ? 'Menyusun Carousel...' : 'Generate Carousel'}
            </Button>
        </div>
    );
}