"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";

const TOUR_STEPS = [
    {
        target: "body",
        content: "Selamat datang di SmartDesign Editor! Mari kita lihat apa saja yang bisa Anda lakukan di sini.",
        placement: "center" as const,
        disableBeacon: true,
    },
    {
        target: ".tour-edit-ai",
        content: "Di panel sebelah kiri ini Anda bisa mengakses alat bantu AI, template desain, menambahkan gambar, atau mengubah rasio canvas.",
        placement: "right" as const,
    },
    {
        target: ".tour-edit-canvas",
        content: "Ini area canvas utama Anda. Klik elemen untuk memindahkan, memutar, atau mengubah ukurannya.",
        placement: "bottom" as const,
    },
    {
        target: ".tour-edit-styles",
        content: "Gunakan panel properti di sebelah kanan untuk mengubah warna (Solid & Gradient), font, dan opsi tampilan lainnya dari elemen yang dipilih.",
        placement: "left" as const,
    },
    {
        target: ".tour-edit-layers",
        content: "Anda juga bisa mengatur urutan tumpukan elemen, dan mengunci atau menghapusnya lewat Panel Layer.",
        placement: "left" as const,
    },
    {
        target: ".tour-edit-export",
        content: "Jika sudah puas dengan hasilnya, klik tombol ini untuk menyimpan atau mengunduh karya desain Anda!",
        placement: "bottom" as const,
    },
];

export const EditorOnboardingTour = () => {
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Only run once per device/browser setup
        const hasSeenTour = localStorage.getItem("has_seen_editor_tour");
        if (!hasSeenTour) {
            // Wait for components to mount fully
            setTimeout(() => setRun(true), 1500);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem("has_seen_editor_tour", "true");
        }
    };

    if (typeof window === "undefined") return null;

    return (
        <Joyride
            steps={TOUR_STEPS}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: "#9333ea", // Tailwind purple-600
                    zIndex: 10000,
                },
            }}
        />
    );
};
