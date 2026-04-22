"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";

const TOUR_STEPS = [
    {
        target: ".tour-step-1",
        content: "Mulai dari tujuan desain Anda. Tulis brief singkat, headline promo, atau hasil yang ingin Anda capai.",
        disableBeacon: true,
    },
    {
        target: ".tour-step-2",
        content: "Tentukan format hasil dan bagaimana teks akan dipakai, agar output pertama lebih dekat ke kebutuhan Anda.",
    },
    {
        target: ".tour-step-3",
        content: "Tekan tombol ini untuk lanjut ke arahan visual atau langsung membuat hasil pertama Anda.",
    },
];

export const OnboardingTour = () => {
    const [run, setRun] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const isAutomatedBrowser = window.navigator.webdriver;
        if (isAutomatedBrowser) {
            return;
        }

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
