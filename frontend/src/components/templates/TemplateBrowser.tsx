"use client";

import React, { useEffect, useState } from 'react';
import { useProjectApi } from '@/lib/api';
import { Loader2, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateData {
    id: string;
    name: string;
    category: string;
    aspect_ratio: string;
    style: string;
    default_text_layers: Record<string, unknown>;
    prompt_suffix?: string;
    thumbnail_url?: string;
}

interface TemplateBrowserProps {
    onSelectTemplate: (template: TemplateData) => void;
    aspectRatio?: string;
    selectedTemplateId?: string;
    compact?: boolean;
}

const CATEGORIES = ['All', 'food', 'sale', 'product', 'event', 'education', 'property', 'story', 'general', 'giveaway', 'hiring', 'testimonial', 'holiday'];
const CATEGORY_LABELS: Record<string, string> = {
    'All': 'Semua',
    'food': '🍔 Makanan',
    'sale': '🛍️ Diskon',
    'product': '📱 Produk',
    'event': '📢 Event',
    'education': '📚 Edukasi',
    'property': '🏢 Properti',
    'story': '📱 Story',
    'general': '🎨 Umum',
    'giveaway': '🎉 Giveaway',
    'hiring': '🤝 Loker',
    'testimonial': '💬 Testimoni',
    'holiday': '❄️ Hari Raya',
};

export const TemplateBrowser: React.FC<TemplateBrowserProps> = ({ onSelectTemplate, aspectRatio, selectedTemplateId, compact = false }) => {
    const { getTemplates } = useProjectApi();
    const [templates, setTemplates] = useState<TemplateData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            try {
                const category = selectedCategory === 'All' ? undefined : selectedCategory;
                const data = await getTemplates(category, aspectRatio);
                setTemplates(data);
            } catch (err) {
                console.error('Failed to load templates:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, aspectRatio]);

    return (
        <div className={`space-y-4 ${compact ? 'mt-0' : 'mt-6'}`}>
            {!compact && (
                <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold font-jakarta">Template</h3>
                </div>
            )}

            {/* Category Tabs */}
            <div className={`flex gap-2 overflow-x-auto pb-2 ${compact ? 'scrollbar-hide' : ''}`}>
                {CATEGORIES.map((cat) => (
                    <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        size={compact ? 'sm' : 'sm'}
                        className={`rounded-full whitespace-nowrap ${compact ? 'text-[10px] h-7 px-3' : 'text-xs'}`}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {CATEGORY_LABELS[cat] || cat}
                    </Button>
                ))}
            </div>

            {/* Template Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <LayoutTemplate className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Belum ada template untuk kategori ini</p>
                </div>
            ) : (
                <div className={compact ? "flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x" : "grid grid-cols-2 md:grid-cols-3 gap-3"}>
                    {templates.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onSelectTemplate(t)}
                            className={`group relative rounded-xl border bg-card overflow-hidden hover:ring-2 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary text-left shrink-0 ${compact ? 'w-24 snap-start' : ''} ${selectedTemplateId === t.id ? 'ring-2 ring-primary border-primary' : 'border-border'}`}
                        >
                            {/* Thumbnail or Placeholder */}
                            <div className={`${compact ? 'aspect-square h-24 w-full' : 'aspect-square'} bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center`}>
                                {t.thumbnail_url ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={t.thumbnail_url}
                                            alt={t.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <LayoutTemplate className="w-8 h-8 opacity-40" />
                                        <span className="text-[10px] uppercase tracking-wider opacity-60">{t.style}</span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            {!compact && (
                                <div className="p-2.5">
                                    <p className="text-sm font-medium truncate">{t.name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{t.aspect_ratio} · {t.style}</p>
                                </div>
                            )}

                            {/* Hover / Selected Overlay */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${selectedTemplateId === t.id ? 'bg-primary/20 opacity-100' : 'bg-primary/10 opacity-0 group-hover:opacity-100'}`}>
                                <span className={`bg-primary text-primary-foreground font-medium rounded-full shadow-sm ${compact ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'}`}>
                                    {selectedTemplateId === t.id ? '✓' : (compact ? 'Pilih' : 'Pilih Preset')}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
