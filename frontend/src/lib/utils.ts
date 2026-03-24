import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// WCAG 2.1 relative luminance calculation
export function getLuminance(hex: string): number {
    const validHex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!validHex) return 1;

    const [r, g, b] = [
        parseInt(validHex[1], 16) / 255,
        parseInt(validHex[2], 16) / 255,
        parseInt(validHex[3], 16) / 255
    ].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG 2.1 contrast ratio calculation
export function getContrastRatio(hex1: string, hex2: string): number {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (lightest + 0.05) / (darkest + 0.05);
}
