import { describe, it, expect } from 'vitest';
import { choosePluralForm, applyReplacements } from '../utils';

/**
 * Laravel Parity Tests
 *
 * These tests are designed to verify that the JavaScript implementation
 * produces identical results to Laravel's PHP implementation.
 *
 * The test cases are derived from Laravel's translation system behavior
 * and should match exactly.
 *
 * @see Laravel\Translation\MessageSelector::choose()
 * @see Laravel\Translation\Translator::makeReplacements()
 */

describe('Laravel MessageSelector::choose() Parity', () => {
    describe('Simple pluralization (no conditions)', () => {
        const testCases = [
            // English: 1 = singular, else = plural
            { line: 'first|second', count: 0, locale: 'en', expected: 'second' },
            { line: 'first|second', count: 1, locale: 'en', expected: 'first' },
            { line: 'first|second', count: 2, locale: 'en', expected: 'second' },
            { line: 'first|second', count: 10, locale: 'en', expected: 'second' },

            // French: 0 and 1 = singular, else = plural
            { line: 'first|second', count: 0, locale: 'fr', expected: 'first' },
            { line: 'first|second', count: 1, locale: 'fr', expected: 'first' },
            { line: 'first|second', count: 2, locale: 'fr', expected: 'second' },

            // Russian: 3 forms (one|few|many)
            { line: 'one|few|many', count: 1, locale: 'ru', expected: 'one' },
            { line: 'one|few|many', count: 2, locale: 'ru', expected: 'few' },
            { line: 'one|few|many', count: 5, locale: 'ru', expected: 'many' },
            { line: 'one|few|many', count: 21, locale: 'ru', expected: 'one' },
            { line: 'one|few|many', count: 22, locale: 'ru', expected: 'few' },
            { line: 'one|few|many', count: 25, locale: 'ru', expected: 'many' },
            { line: 'one|few|many', count: 11, locale: 'ru', expected: 'many' },
            { line: 'one|few|many', count: 12, locale: 'ru', expected: 'many' },

            // Japanese: always first form
            { line: 'item|items', count: 0, locale: 'ja', expected: 'item' },
            { line: 'item|items', count: 1, locale: 'ja', expected: 'item' },
            { line: 'item|items', count: 100, locale: 'ja', expected: 'item' },
        ];

        testCases.forEach(({ line, count, locale, expected }) => {
            it(`"${line}" with count=${count} and locale=${locale} returns "${expected}"`, () => {
                expect(choosePluralForm(line, count, locale)).toBe(expected);
            });
        });
    });

    describe('Exact conditions {n}', () => {
        const testCases = [
            { line: '{0} none|{1} one|{2} two', count: 0, locale: 'en', expected: 'none' },
            { line: '{0} none|{1} one|{2} two', count: 1, locale: 'en', expected: 'one' },
            { line: '{0} none|{1} one|{2} two', count: 2, locale: 'en', expected: 'two' },
            // When no condition matches, Laravel uses locale rules on stripped segments
            // For English with count=5: getPluralIndex returns 1 (since 5 != 1), so segments[1] = 'one'
            { line: '{0} none|{1} one|{2} two', count: 5, locale: 'en', expected: 'one' },

            // Mixed: some exact, some without
            {
                line: '{0} No items|{1} One item|[2,*] :count items',
                count: 0,
                locale: 'en',
                expected: 'No items',
            },
            {
                line: '{0} No items|{1} One item|[2,*] :count items',
                count: 1,
                locale: 'en',
                expected: 'One item',
            },
            {
                line: '{0} No items|{1} One item|[2,*] :count items',
                count: 5,
                locale: 'en',
                expected: ':count items',
            },
        ];

        testCases.forEach(({ line, count, locale, expected }) => {
            it(`"${line}" with count=${count} returns "${expected}"`, () => {
                expect(choosePluralForm(line, count, locale)).toBe(expected);
            });
        });
    });

    describe('Range conditions [min,max]', () => {
        const testCases = [
            // Inclusive ranges
            { line: '[0,1] few|[2,10] some|[11,*] many', count: 0, locale: 'en', expected: 'few' },
            { line: '[0,1] few|[2,10] some|[11,*] many', count: 1, locale: 'en', expected: 'few' },
            { line: '[0,1] few|[2,10] some|[11,*] many', count: 2, locale: 'en', expected: 'some' },
            { line: '[0,1] few|[2,10] some|[11,*] many', count: 10, locale: 'en', expected: 'some' },
            { line: '[0,1] few|[2,10] some|[11,*] many', count: 11, locale: 'en', expected: 'many' },
            { line: '[0,1] few|[2,10] some|[11,*] many', count: 100, locale: 'en', expected: 'many' },

            // Open-ended range [*,n]
            { line: '[*,5] up to five|[6,*] more than five', count: 3, locale: 'en', expected: 'up to five' },
            { line: '[*,5] up to five|[6,*] more than five', count: 5, locale: 'en', expected: 'up to five' },
            { line: '[*,5] up to five|[6,*] more than five', count: 6, locale: 'en', expected: 'more than five' },
        ];

        testCases.forEach(({ line, count, locale, expected }) => {
            it(`"${line}" with count=${count} returns "${expected}"`, () => {
                expect(choosePluralForm(line, count, locale)).toBe(expected);
            });
        });
    });

    describe('Complex real-world examples', () => {
        it('handles common Laravel validation message pattern', () => {
            const line = '{0} The :attribute field is required.|[1,*] The :attribute field must have at least :min items.';
            expect(choosePluralForm(line, 0, 'en')).toBe('The :attribute field is required.');
            expect(choosePluralForm(line, 1, 'en')).toBe(
                'The :attribute field must have at least :min items.'
            );
            expect(choosePluralForm(line, 5, 'en')).toBe(
                'The :attribute field must have at least :min items.'
            );
        });

        it('handles time ago patterns', () => {
            const line = '{1} :count minute ago|[2,*] :count minutes ago';
            expect(choosePluralForm(line, 1, 'en')).toBe(':count minute ago');
            expect(choosePluralForm(line, 2, 'en')).toBe(':count minutes ago');
            expect(choosePluralForm(line, 60, 'en')).toBe(':count minutes ago');
        });
    });
});

describe('Laravel Translator::makeReplacements() Parity', () => {
    describe('Basic replacements', () => {
        it('replaces :key with value', () => {
            expect(applyReplacements('Hello :name', { name: 'World' })).toBe('Hello World');
        });

        it('replaces multiple different placeholders', () => {
            expect(applyReplacements(':greeting :name!', { greeting: 'Hello', name: 'John' })).toBe(
                'Hello John!'
            );
        });

        it('replaces same placeholder multiple times', () => {
            expect(applyReplacements(':name loves :name', { name: 'John' })).toBe('John loves John');
        });
    });

    describe('Case transformations', () => {
        it(':key preserves original case', () => {
            expect(applyReplacements(':name', { name: 'john' })).toBe('john');
            expect(applyReplacements(':name', { name: 'JOHN' })).toBe('JOHN');
            expect(applyReplacements(':name', { name: 'John' })).toBe('John');
        });

        it(':Key applies Str::ucfirst() - uppercase first letter', () => {
            expect(applyReplacements(':Name', { name: 'john' })).toBe('John');
            expect(applyReplacements(':Name', { name: 'jOHN' })).toBe('JOHN');
        });

        it(':KEY applies Str::upper() - all uppercase', () => {
            expect(applyReplacements(':NAME', { name: 'john' })).toBe('JOHN');
            expect(applyReplacements(':NAME', { name: 'John' })).toBe('JOHN');
        });

        it('handles all three transformations in one string', () => {
            const result = applyReplacements(':name, :Name, :NAME', { name: 'world' });
            expect(result).toBe('world, World, WORLD');
        });
    });

    describe('Replacement key normalization', () => {
        it('matches keys case-insensitively', () => {
            expect(applyReplacements(':name', { NAME: 'John' })).toBe('John');
            expect(applyReplacements(':name', { Name: 'John' })).toBe('John');
            expect(applyReplacements(':NAME', { name: 'john' })).toBe('JOHN');
        });
    });

    describe('Missing replacements', () => {
        it('keeps placeholder when key not provided', () => {
            expect(applyReplacements('Hello :name', {})).toBe('Hello :name');
        });

        it('keeps placeholder when value is null', () => {
            expect(applyReplacements('Hello :name', { name: null })).toBe('Hello :name');
        });

        it('keeps placeholder when value is undefined', () => {
            expect(applyReplacements('Hello :name', { name: undefined })).toBe('Hello :name');
        });
    });

    describe('Numeric values', () => {
        it('converts numbers to strings', () => {
            expect(applyReplacements(':count items', { count: 5 })).toBe('5 items');
        });

        it('handles zero', () => {
            expect(applyReplacements(':count items', { count: 0 })).toBe('0 items');
        });

        it('handles negative numbers', () => {
            expect(applyReplacements(':count degrees', { count: -10 })).toBe('-10 degrees');
        });

        it('handles floating point numbers', () => {
            expect(applyReplacements(':price dollars', { price: 9.99 })).toBe('9.99 dollars');
        });
    });

    describe('Complex placeholder names', () => {
        it('handles underscores', () => {
            expect(applyReplacements(':user_name', { user_name: 'John' })).toBe('John');
        });

        it('handles numbers after first character', () => {
            expect(applyReplacements(':item1 and :item2', { item1: 'A', item2: 'B' })).toBe('A and B');
        });

        it('does not match if placeholder starts with number', () => {
            // :1name is not a valid placeholder - the regex requires [a-zA-Z_] as first char
            expect(applyReplacements(':1name', { '1name': 'test' })).toBe(':1name');
        });
    });
});

describe('Full trans_choice simulation', () => {
    /**
     * Simulates Laravel's trans_choice() by combining choosePluralForm and applyReplacements
     */
    function trans_choice_simulation(
        line: string,
        count: number,
        replacements: Record<string, string | number> = {},
        locale: string = 'en'
    ): string {
        const replacementsWithCount = { ...replacements, count };
        const chosenForm = choosePluralForm(line, count, locale);
        return applyReplacements(chosenForm, replacementsWithCount);
    }

    it('handles simple pluralization with :count', () => {
        expect(trans_choice_simulation(':count item|:count items', 1)).toBe('1 item');
        expect(trans_choice_simulation(':count item|:count items', 5)).toBe('5 items');
    });

    it('handles complex Laravel pattern', () => {
        const line = '{0} No items|{1} :count item|[2,*] :count items';
        expect(trans_choice_simulation(line, 0)).toBe('No items');
        expect(trans_choice_simulation(line, 1)).toBe('1 item');
        expect(trans_choice_simulation(line, 5)).toBe('5 items');
        expect(trans_choice_simulation(line, 100)).toBe('100 items');
    });

    it('handles replacements with pluralization', () => {
        const line = '{0} :name has no apples|{1} :name has :count apple|[2,*] :name has :count apples';
        expect(trans_choice_simulation(line, 0, { name: 'John' })).toBe('John has no apples');
        expect(trans_choice_simulation(line, 1, { name: 'John' })).toBe('John has 1 apple');
        expect(trans_choice_simulation(line, 5, { name: 'John' })).toBe('John has 5 apples');
    });

    it('handles Russian pluralization', () => {
        const line = ':count яблоко|:count яблока|:count яблок';
        expect(trans_choice_simulation(line, 1, {}, 'ru')).toBe('1 яблоко');
        expect(trans_choice_simulation(line, 2, {}, 'ru')).toBe('2 яблока');
        expect(trans_choice_simulation(line, 5, {}, 'ru')).toBe('5 яблок');
        expect(trans_choice_simulation(line, 21, {}, 'ru')).toBe('21 яблоко');
        expect(trans_choice_simulation(line, 22, {}, 'ru')).toBe('22 яблока');
        expect(trans_choice_simulation(line, 25, {}, 'ru')).toBe('25 яблок');
    });

    it('handles French pluralization', () => {
        const line = ':count article|:count articles';
        expect(trans_choice_simulation(line, 0, {}, 'fr')).toBe('0 article');
        expect(trans_choice_simulation(line, 1, {}, 'fr')).toBe('1 article');
        expect(trans_choice_simulation(line, 2, {}, 'fr')).toBe('2 articles');
    });

    it('handles case transformations with pluralization', () => {
        const line = '{0} :Name has nothing|[1,*] :NAME has :count items';
        expect(trans_choice_simulation(line, 0, { name: 'john' })).toBe('John has nothing');
        expect(trans_choice_simulation(line, 5, { name: 'john' })).toBe('JOHN has 5 items');
    });
});

describe('Edge cases and special scenarios', () => {
    it('handles empty string', () => {
        expect(choosePluralForm('', 5, 'en')).toBe('');
    });

    it('handles single segment (no pipes)', () => {
        expect(choosePluralForm('items', 0, 'en')).toBe('items');
        expect(choosePluralForm('items', 1, 'en')).toBe('items');
        expect(choosePluralForm('items', 5, 'en')).toBe('items');
    });

    it('handles whitespace around segments', () => {
        expect(choosePluralForm('  one  |  many  ', 1, 'en')).toBe('one');
        expect(choosePluralForm('  one  |  many  ', 5, 'en')).toBe('many');
    });

    it('handles segments with only conditions and no text after stripping', () => {
        // Edge case: what if all segments have conditions but none match?
        const line = '{0} zero|{1} one';
        // For count=5, no exact match, should fall back to locale rules on stripped values
        expect(choosePluralForm(line, 5, 'en')).toBe('one');
    });

    it('preserves special characters in translation', () => {
        expect(applyReplacements('<b>:name</b>', { name: 'John' })).toBe('<b>John</b>');
        expect(applyReplacements(':name & :other', { name: 'A', other: 'B' })).toBe('A & B');
    });

    it('handles very long translation strings', () => {
        const longText = 'a'.repeat(10000);
        const line = `${longText}|${longText}s`;
        expect(choosePluralForm(line, 1, 'en')).toBe(longText);
        expect(choosePluralForm(line, 2, 'en')).toBe(`${longText}s`);
    });
});
