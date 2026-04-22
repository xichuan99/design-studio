"use client";

import { useMemo, useState } from 'react';
import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppHeader } from '@/components/layout/AppHeader';
import { BrandSwitcher } from '@/components/editor/BrandSwitcher';
import { CarouselGeneratorForm } from '@/components/carousel/CarouselGeneratorForm';
import { CarouselSlideEditor } from '@/components/carousel/CarouselSlideEditor';
import { InstagramCarouselPreview } from '@/components/carousel/InstagramCarouselPreview';
import { Button } from '@/components/ui/button';
import { useCarouselApi } from '@/lib/api/carouselApi';
import type { CarouselGenerateRequest, CarouselGenerateResponse } from '@/lib/api';


const DEFAULT_FORM: CarouselGenerateRequest = {
    topic: '',
    brand_name: '',
    ig_handle: '@brand.id',
    primary_color: '#6C5CE7',
    font_style: 'modern',
    tone: 'professional',
    num_slides: 7,
};


export default function CarouselCreatePage() {
    const { status } = useSession();
    const { generateCarousel, regenerateCarouselSlide, exportCarouselZip } = useCarouselApi();

    const [form, setForm] = useState<CarouselGenerateRequest>(DEFAULT_FORM);
    const [carousel, setCarousel] = useState<CarouselGenerateResponse | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [regenerateInstruction, setRegenerateInstruction] = useState('');

    const activeSlide = carousel?.slides[activeIndex] ?? null;

    const exportDisabled = useMemo(() => !carousel || carousel.slides.length === 0, [carousel]);

    if (status === 'loading') {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (status === 'unauthenticated') {
        redirect('/');
    }

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await generateCarousel(form);
            setCarousel(response);
            setActiveIndex(0);
            setRegenerateInstruction('');
            toast.success('Carousel siap ditinjau.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal membuat carousel.';
            toast.error(message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSlideChange = (nextSlide: NonNullable<typeof activeSlide>) => {
        if (!carousel) return;
        const nextSlides = carousel.slides.map((slide, index) => index === activeIndex ? nextSlide : slide);
        setCarousel({ ...carousel, slides: nextSlides });
    };

    const handleRegenerate = async () => {
        if (!carousel || !activeSlide) return;
        setIsRegenerating(true);
        try {
            const nextSlide = await regenerateCarouselSlide({
                ...form,
                carousel_id: carousel.carousel_id,
                slide_index: activeSlide.index,
                instruction: regenerateInstruction || undefined,
                slides: carousel.slides,
            });
            const nextSlides = carousel.slides.map((slide, index) => index === activeIndex ? nextSlide : slide);
            setCarousel({ ...carousel, slides: nextSlides });
            toast.success(`Slide ${activeSlide.index} diperbarui.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengganti slide.';
            toast.error(message);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleExport = async () => {
        if (!carousel) return;
        setIsExporting(true);
        try {
            const blob = await exportCarouselZip({
                carousel_id: carousel.carousel_id,
                brand_name: form.brand_name,
                ig_handle: form.ig_handle,
                brand_tokens: carousel.brand_tokens,
                slides: carousel.slides,
            });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${carousel.carousel_id}.zip`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            toast.success('ZIP carousel berhasil diunduh.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengekspor carousel.';
            toast.error(message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                renderActions={() => (
                    <div className="flex items-center gap-3">
                        <BrandSwitcher />
                    </div>
                )}
            />

            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:px-6">
                <div className="space-y-6">
                    <CarouselGeneratorForm value={form} isSubmitting={isGenerating} onChange={setForm} onSubmit={handleGenerate} />
                    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-foreground">Export</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Ekspor semua slide menjadi ZIP PNG 1080x1350 untuk langsung dipakai di Instagram.</p>
                        <Button className="mt-4 w-full gap-2" onClick={handleExport} disabled={exportDisabled || isExporting}>
                            <Download className="h-4 w-4" />
                            {isExporting ? 'Mengekspor ZIP...' : 'Export ZIP Carousel'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {carousel ? (
                        <>
                            <InstagramCarouselPreview
                                slides={carousel.slides}
                                activeIndex={activeIndex}
                                brandName={form.brand_name}
                                igHandle={form.ig_handle}
                                tokens={carousel.brand_tokens}
                                onSelect={setActiveIndex}
                            />
                            {activeSlide && (
                                <CarouselSlideEditor
                                    slide={activeSlide}
                                    instruction={regenerateInstruction}
                                    isRegenerating={isRegenerating}
                                    onSlideChange={handleSlideChange}
                                    onInstructionChange={setRegenerateInstruction}
                                    onRegenerate={handleRegenerate}
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex min-h-[640px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/70 px-8 text-center shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Path C Preview</p>
                            <h2 className="mt-2 text-3xl font-bold text-foreground">Carousel akan muncul di sini</h2>
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                Isi form di kiri untuk membuat draft carousel pertama. Setelah itu Anda bisa edit setiap slide, regenerasi slide tertentu, lalu export ZIP tanpa menyentuh flow desain tunggal.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}