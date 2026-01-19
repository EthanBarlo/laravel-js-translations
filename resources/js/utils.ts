/**
 * Translation Utilities
 *
 * Core translation logic for pluralization and placeholder replacements.
 * Follows Laravel's translation conventions.
 */

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
 * Choose the correct plural form based on count.
 */
export function choosePluralForm(translationString: string, count: number): string {
    const segments = parsePluralString(translationString);

    if (segments.length === 0) {
        return translationString;
    }

    // For simple "one|many" pluralization (no intervals), handle count === 1 specially
    const hasIntervals = segments.some(
        (seg) => seg.exact !== undefined || seg.min !== undefined || seg.max !== undefined
    );

    if (!hasIntervals) {
        // Simple pluralization: first segment for count === 1, second for count !== 1
        // This matches Laravel's trans_choice behavior where 0 uses plural form
        if (count === 1 && segments.length > 0) {
            return segments[0].value;
        } else if (segments.length > 1) {
            return segments[1].value;
        } else if (segments.length > 0) {
            return segments[0].value; // fallback to first segment
        }
    }

    // Find the first segment that matches the count (for interval-based pluralization)
    for (const segment of segments) {
        if (countMatchesSegment(count, segment)) {
            return segment.value;
        }
    }

    // Fallback: if no segments match, use the last segment
    return segments[segments.length - 1].value;
}

/**
 * Apply replacements to a translation string.
 *
 * Supports Laravel-style replacements:
 * - :name → lowercase
 * - :Name → ucfirst
 * - :NAME → uppercase
 */
export function applyReplacements(
    template: string,
    replacements: ReplacementValues = {}
): string {
    if (!template || Object.keys(replacements).length === 0) {
        return template;
    }

    return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
        const value = replacements[key.toLowerCase()];

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
