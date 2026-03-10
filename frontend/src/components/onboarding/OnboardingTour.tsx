"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";

const TOUR_STEPS = [
    {
        target: ".tour-step-1",
        content: "Selamat datang! Masukkan deskripsi desain atau teks pengumuman Anda di sini (misal: Banner Kopi Susu Diskon 50%).",
        disableBeacon: true,
    },
    {
        target: ".tour-step-2",
        content: "Pilih rasio gambar dan gaya desain yang sesuai untuk brand Anda.",
    },
    {
        target: ".tour-step-3",
        content: "Tekan tombol ini untuk menghasilkan template desain otomatis dari AI!",
    },
];

export const OnboardingTour = () => {
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Only run once per device/browser setup
        const hasSeenTour = localStorage.getItem("has_seen_tour");
        if (!hasSeenTour) {
            // Small delay to let the UI render fully
            setTimeout(() => setRun(true), 500);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem("has_seen_tour", "true");
        }
    };

    if (typeof window === "undefined") return null; // SSR guard

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
