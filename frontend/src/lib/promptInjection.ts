import { BrandKitProfile } from './api';

/**
 * Injects strict brand constraints into a user prompt.
 * 
 * @param activeBrand The currently active BrandKitProfile
 * @param userPrompt The user's original design prompt
 * @returns The enhanced prompt string with strict color and typography constraints
 */
export function generateStrictBrandPrompt(
    activeBrand: BrandKitProfile | null,
    userPrompt: string
): string {
    if (!activeBrand) {
        return userPrompt;
    }

    let brandConstraints = "";
    const { colors, typography } = activeBrand;

    // Build Color Constraints
    if (colors && colors.length > 0) {
        const colorStrs = colors
            .filter(c => c.hex) // ensure hex exists
            .map(c => `${c.role.toUpperCase()}: ${c.hex}`);
            
        if (colorStrs.length > 0) {
            brandConstraints += `\nUse ONLY these exact hex colors: ${colorStrs.join(', ')}.`;
        }
    }

    // Build Typography Constraints
    if (typography) {
        const fontStrs: string[] = [];
        if (typography.primaryFont) {
            fontStrs.push(`Headline Font: ${typography.primaryFont}`);
        }
        if (typography.secondaryFont) {
            fontStrs.push(`Body Font: ${typography.secondaryFont}`);
        }
        
        if (fontStrs.length > 0) {
            brandConstraints += `\nTypography constraints: ${fontStrs.join(', ')}.`;
        }
    }

    // If no specific constraints were found, return the original prompt
    if (!brandConstraints) {
        return userPrompt;
    }

    // Combine and add the critical wrapper
    return `${userPrompt.trim()}

CRITICAL INSTRUCTION:
${brandConstraints}
Do not improvise or add any other colors or fonts.`;
}
