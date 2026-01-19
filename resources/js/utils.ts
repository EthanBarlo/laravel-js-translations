/**
 * Translation Utilities
 *
 * Core translation logic for pluralization and placeholder replacements.
 * Follows Laravel's translation conventions.
 */

import { getPluralIndex } from './pluralRules';

export interface PluralSegment {
    value: string;
    min?: number;
    max?: number;
    exact?: number;
}

export type ReplacementValues = Record<string, string | number | null | undefined>;

/**
 * Parse a Laravel-style plural string into segments.
 *
 * Supports formats like:
 * - Simple: "item|items"
 * - Exact: "{0} No items|{1} One item|[2,*] :count items"
 * - Ranges: "[0,10] A few|[11,100] Many|[101,*] Lots"
 */
export function parsePluralString(translationString: string): PluralSegment[] {
    const segments: PluralSegment[] = [];

    // Split on pipes that are not escaped
    const parts = translationString.split(/(?<!\\)\|/);

    for (const part of parts) {
        const trimmedPart = part.trim();

        // Check for interval syntax like {0}, [1,19], [20,*]
        const intervalMatch = trimmedPart.match(/^(\{[^}]+\}|\[[^\]]+\])\s*(.+)$/);

        if (intervalMatch) {
            const intervalStr = intervalMatch[1];
            // Replace escaped pipes with actual pipes
            const value = intervalMatch[2].replace(/\\\|/g, '|');

            // Parse different interval types
            if (intervalStr.startsWith('{')) {
                // Exact value: {0}, {1}, etc.
                const exact = parseInt(intervalStr.slice(1, -1));
                if (!isNaN(exact)) {
                    segments.push({ value, exact });
                }
            } else if (intervalStr.startsWith('[')) {
                // Range: [1,19], [20,*], etc.
                const rangeContent = intervalStr.slice(1, -1);
                const [minStr, maxStr] = rangeContent.split(',');

                const min = minStr === '*' ? undefined : parseInt(minStr);
                const max = maxStr === '*' ? undefined : parseInt(maxStr);

                if (!isNaN(min!) || min === undefined) {
                    if (!isNaN(max!) || max === undefined) {
                        segments.push({ value, min, max });
                    }
                }
            }
        } else {
            // Simple segment without interval (used for default pluralization)
            // Replace escaped pipes with actual pipes
            segments.push({ value: trimmedPart.replace(/\\\|/g, '|') });
        }
    }

    return segments;
}

/**
 * Check if a count matches a plural segment.
 */
export function countMatchesSegment(count: number, segment: PluralSegment): boolean {
    if (segment.exact !== undefined) {
        return count === segment.exact;
    }

    if (segment.min !== undefined || segment.max !== undefined) {
        const min = segment.min ?? -Infinity;
        const max = segment.max ?? Infinity;
        return count >= min && count <= max;
    }

    // Default segment (no interval) - this matches when count > 1
    // for simple "one|many" pluralization
    return count > 1;
}

/**
 * Choose the correct plural form based on count and locale.
 *
 * This mirrors Laravel's MessageSelector::choose() method:
 * 1. First, try to extract a form using explicit intervals ({n} or [min,max])
 * 2. If no intervals match, use locale-specific plural rules
 */
export function choosePluralForm(
    translationString: string,
    count: number,
    locale: string = 'en'
): string {
    const segments = parsePluralString(translationString);

    if (segments.length === 0) {
        return translationString;
    }

    // Check if any segment has explicit interval conditions
    const hasIntervals = segments.some(
        (seg) => seg.exact !== undefined || seg.min !== undefined || seg.max !== undefined
    );

    // First, try to find a matching interval condition
    if (hasIntervals) {
        for (const segment of segments) {
            if (countMatchesSegment(count, segment)) {
                return segment.value;
            }
        }
    }

    // For simple pluralization (no intervals or no interval matched),
    // use locale-specific plural rules (matching Laravel's behavior)
    const strippedSegments = segments.map((seg) => seg.value);
    const pluralIndex = getPluralIndex(locale, count);

    // If we have only one segment or the plural index is out of bounds, return the first
    if (strippedSegments.length === 1 || pluralIndex >= strippedSegments.length) {
        return strippedSegments[0];
    }

    return strippedSegments[pluralIndex];
}

/**
 * Apply replacements to a translation string.
 *
 * Supports Laravel-style replacements:
 * - :name → lowercase
 * - :Name → ucfirst
 * - :NAME → uppercase
 *
 * Replacement keys are matched case-insensitively (matching Laravel behavior).
 */
export function applyReplacements(
    template: string,
    replacements: ReplacementValues = {}
): string {
    if (!template || Object.keys(replacements).length === 0) {
        return template;
    }

    // Normalize replacement keys to lowercase for case-insensitive matching (Laravel behavior)
    const normalizedReplacements: ReplacementValues = {};
    for (const [key, value] of Object.entries(replacements)) {
        normalizedReplacements[key.toLowerCase()] = value;
    }

    return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
        const value = normalizedReplacements[key.toLowerCase()];

        if (value === null || value === undefined) {
            return match; // Keep the placeholder if no replacement provided
        }

        const valueStr = String(value);

        // Handle case transformations (Laravel behavior)
        if (key === key.toUpperCase()) {
            return valueStr.toUpperCase();
        } else if (key.charAt(0) === key.charAt(0).toUpperCase()) {
            return valueStr.charAt(0).toUpperCase() + valueStr.slice(1);
        } else {
            return valueStr;
        }
    });
}
