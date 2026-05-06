"use client";

import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TestimonialForm {
    name: string;
    role: string;
    quote: string;
}

interface TestimonialDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    generatedDesignCount: number;
    hasSubmitted: boolean;
    testimonialForm: TestimonialForm;
    setTestimonialForm: React.Dispatch<React.SetStateAction<TestimonialForm>>;
    isSubmitting: boolean;
    onSubmit: () => void;
}

export function TestimonialDialog({
    open,
    onOpenChange,
    generatedDesignCount,
    hasSubmitted,
    testimonialForm,
    setTestimonialForm,
    isSubmitting,
    onSubmit,
}: TestimonialDialogProps) {
    const posthog = usePostHog();

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && !hasSubmitted) {
                    posthog?.capture("testimonial_prompt_dismissed", {
                        generated_count: generatedDesignCount,
                        source: "create_prompt_after_5_generations",
                    });
                }
                onOpenChange(nextOpen);
            }}
        >
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Bantu kami dengan testimoni singkat</DialogTitle>
                    <DialogDescription>
                        Kamu sudah membuat {generatedDesignCount} desain. Cerita singkat Kamu akan membantu creator lain memahami hasil yang bisa dicapai di SmartDesign.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="testimonial-name" className="text-sm font-medium text-foreground">Nama</label>
                        <Input
                            id="testimonial-name"
                            value={testimonialForm.name}
                            onChange={(e) => setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Contoh: Rina Putri"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="testimonial-role" className="text-sm font-medium text-foreground">Role / bisnis</label>
                        <Input
                            id="testimonial-role"
                            value={testimonialForm.role}
                            onChange={(e) => setTestimonialForm((prev) => ({ ...prev, role: e.target.value }))}
                            placeholder="Contoh: Owner Toko Fashion"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="testimonial-quote" className="text-sm font-medium text-foreground">Testimoni</label>
                        <Textarea
                            id="testimonial-quote"
                            value={testimonialForm.quote}
                            onChange={(e) => setTestimonialForm((prev) => ({ ...prev, quote: e.target.value }))}
                            placeholder="Apa perubahan terbesar yang Kamu rasakan sejak pakai SmartDesign?"
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Nanti saja
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Mengirim..." : "Kirim Testimoni"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
