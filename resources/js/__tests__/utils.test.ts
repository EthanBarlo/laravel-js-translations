import { describe, it, expect } from 'vitest';
import {
    applyReplacements,
    parsePluralString,
    countMatchesSegment,
    choosePluralForm,
} from '../utils';

describe('applyReplacements', () => {
    describe('basic replacements', () => {
        it('replaces :name with value', () => {
            expect(applyReplacements('Hello :name', { name: 'World' })).toBe('Hello World');
        });

        it('replaces multiple placeholders', () => {
            expect(applyReplacements(':greeting :name', { greeting: 'Hi', name: 'John' })).toBe(
                'Hi John'
            );
        });

        it('replaces same placeholder multiple times', () => {
            expect(applyReplacements(':name and :name', { name: 'John' })).toBe('John and John');
        });

        it('keeps placeholder when no replacement provided', () => {
            expect(applyReplacements('Hello :name', {})).toBe('Hello :name');
        });

        it('handles null replacements by keeping placeholder', () => {
            expect(applyReplacements('Hello :name', { name: null })).toBe('Hello :name');
        });

        it('handles undefined replacements by keeping placeholder', () => {
            expect(applyReplacements('Hello :name', { name: undefined })).toBe('Hello :name');
        });

        it('converts numbers to strings', () => {
            expect(applyReplacements('Count: :count', { count: 42 })).toBe('Count: 42');
        });

        it('converts zero to string', () => {
            expect(applyReplacements('Count: :count', { count: 0 })).toBe('Count: 0');
        });

        it('handles empty string replacement', () => {
            expect(applyReplacements('Hello :name!', { name: '' })).toBe('Hello !');
        });
    });

    describe('case transformations', () => {
        it(':name keeps original value', () => {
            expect(applyReplacements(':name', { name: 'world' })).toBe('world');
        });

        it(':name keeps uppercase value', () => {
            expect(applyReplacements(':name', { name: 'WORLD' })).toBe('WORLD');
        });

        it(':Name applies ucfirst (first letter uppercase)', () => {
            expect(applyReplacements(':Name', { name: 'world' })).toBe('World');
        });

        it(':Name preserves rest of string as-is', () => {
            expect(applyReplacements(':Name', { name: 'hELLO' })).toBe('HELLO');
        });

        it(':NAME applies full uppercase', () => {
            expect(applyReplacements(':NAME', { name: 'world' })).toBe('WORLD');
        });

        it(':NAME applies uppercase to mixed case', () => {
            expect(applyReplacements(':NAME', { name: 'HeLLo' })).toBe('HELLO');
        });

        it('handles mixed case placeholders in one string', () => {
            expect(applyReplacements(':name :Name :NAME', { name: 'test' })).toBe('test Test TEST');
        });

        it('handles underscore in placeholder names', () => {
            expect(applyReplacements(':user_name', { user_name: 'John' })).toBe('John');
        });

        it('handles numbers in placeholder names', () => {
            expect(applyReplacements(':item1', { item1: 'first' })).toBe('first');
        });

        it('lookups are case-insensitive for replacement keys', () => {
            expect(applyReplacements(':name', { NAME: 'World' })).toBe('World');
            expect(applyReplacements(':NAME', { name: 'world' })).toBe('WORLD');
        });
    });

    describe('edge cases', () => {
        it('returns empty string for empty template', () => {
            expect(applyReplacements('', { name: 'test' })).toBe('');
        });

        it('returns template when no replacements object', () => {
            expect(applyReplacements('Hello :name')).toBe('Hello :name');
        });

        it('returns template when replacements is empty', () => {
            expect(applyReplacements('Hello :name', {})).toBe('Hello :name');
        });

        it('handles template with no placeholders', () => {
            expect(applyReplacements('Hello World', { name: 'John' })).toBe('Hello World');
        });

        it('does not replace partial matches', () => {
            // :na should not match :name replacement
            expect(applyReplacements(':na :name', { name: 'John' })).toBe(':na John');
        });

        it('handles special regex characters in value', () => {
            expect(applyReplacements(':name', { name: '$100 (test)' })).toBe('$100 (test)');
        });
    });
});

describe('parsePluralString', () => {
    it('parses simple pipe-separated string', () => {
        const segments = parsePluralString('one|many');
        expect(segments).toHaveLength(2);
        expect(segments[0].value).toBe('one');
        expect(segments[1].value).toBe('many');
    });

    it('parses three-part string', () => {
        const segments = parsePluralString('one|few|many');
        expect(segments).toHaveLength(3);
        expect(segments[0].value).toBe('one');
        expect(segments[1].value).toBe('few');
        expect(segments[2].value).toBe('many');
    });

    it('parses exact conditions {n}', () => {
        const segments = parsePluralString('{0} zero|{1} one|{2} two');
        expect(segments[0]).toEqual({ value: 'zero', exact: 0 });
        expect(segments[1]).toEqual({ value: 'one', exact: 1 });
        expect(segments[2]).toEqual({ value: 'two', exact: 2 });
    });

    it('parses range conditions [min,max]', () => {
        const segments = parsePluralString('[0,1] few|[2,10] some|[11,100] many');
        expect(segments[0]).toEqual({ value: 'few', min: 0, max: 1 });
        expect(segments[1]).toEqual({ value: 'some', min: 2, max: 10 });
        expect(segments[2]).toEqual({ value: 'many', min: 11, max: 100 });
    });

    it('parses open-ended range [n,*]', () => {
        const segments = parsePluralString('[2,*] many');
        expect(segments[0]).toEqual({ value: 'many', min: 2, max: undefined });
    });

    it('parses open-ended range [*,n]', () => {
        const segments = parsePluralString('[*,5] up to five');
        expect(segments[0]).toEqual({ value: 'up to five', min: undefined, max: 5 });
    });

    it('handles escaped pipes', () => {
        const segments = parsePluralString('one\\|thing|many\\|things');
        expect(segments[0].value).toBe('one|thing');
        expect(segments[1].value).toBe('many|things');
    });

    it('handles mixed conditions and simple segments', () => {
        const segments = parsePluralString('{0} none|{1} one|[2,*] :count items');
        expect(segments[0]).toEqual({ value: 'none', exact: 0 });
        expect(segments[1]).toEqual({ value: 'one', exact: 1 });
        expect(segments[2]).toEqual({ value: ':count items', min: 2, max: undefined });
    });

    it('trims whitespace', () => {
        const segments = parsePluralString('  one  |  many  ');
        expect(segments[0].value).toBe('one');
        expect(segments[1].value).toBe('many');
    });
});

describe('countMatchesSegment', () => {
    it('matches exact value', () => {
        expect(countMatchesSegment(0, { value: 'zero', exact: 0 })).toBe(true);
        expect(countMatchesSegment(1, { value: 'one', exact: 1 })).toBe(true);
        expect(countMatchesSegment(2, { value: 'one', exact: 1 })).toBe(false);
    });

    it('matches range [min,max]', () => {
        const segment = { value: 'few', min: 2, max: 5 };
        expect(countMatchesSegment(1, segment)).toBe(false);
        expect(countMatchesSegment(2, segment)).toBe(true);
        expect(countMatchesSegment(3, segment)).toBe(true);
        expect(countMatchesSegment(5, segment)).toBe(true);
        expect(countMatchesSegment(6, segment)).toBe(false);
    });

    it('matches open-ended range [n,*]', () => {
        const segment = { value: 'many', min: 10, max: undefined };
        expect(countMatchesSegment(9, segment)).toBe(false);
        expect(countMatchesSegment(10, segment)).toBe(true);
        expect(countMatchesSegment(1000, segment)).toBe(true);
    });

    it('matches open-ended range [*,n]', () => {
        const segment = { value: 'few', min: undefined, max: 5 };
        expect(countMatchesSegment(0, segment)).toBe(true);
        expect(countMatchesSegment(5, segment)).toBe(true);
        expect(countMatchesSegment(6, segment)).toBe(false);
    });

    it('default segment matches count > 1', () => {
        const segment = { value: 'many' };
        expect(countMatchesSegment(0, segment)).toBe(false);
        expect(countMatchesSegment(1, segment)).toBe(false);
        expect(countMatchesSegment(2, segment)).toBe(true);
        expect(countMatchesSegment(100, segment)).toBe(true);
    });
});

describe('choosePluralForm', () => {
    describe('simple pluralization with English locale', () => {
        it('returns first form for count=1', () => {
            expect(choosePluralForm('item|items', 1, 'en')).toBe('item');
        });

        it('returns second form for count=0', () => {
            expect(choosePluralForm('item|items', 0, 'en')).toBe('items');
        });

        it('returns second form for count>1', () => {
            expect(choosePluralForm('item|items', 5, 'en')).toBe('items');
            expect(choosePluralForm('item|items', 100, 'en')).toBe('items');
        });

        it('returns first form for single segment', () => {
            expect(choosePluralForm('items', 0, 'en')).toBe('items');
            expect(choosePluralForm('items', 1, 'en')).toBe('items');
            expect(choosePluralForm('items', 5, 'en')).toBe('items');
        });
    });

    describe('exact conditions', () => {
        it('matches {0} exactly', () => {
            expect(choosePluralForm('{0} none|{1} one|other', 0, 'en')).toBe('none');
        });

        it('matches {1} exactly', () => {
            expect(choosePluralForm('{0} none|{1} one|other', 1, 'en')).toBe('one');
        });

        it('falls back when no exact match', () => {
            expect(choosePluralForm('{0} none|{1} one|fallback', 5, 'en')).toBe('fallback');
        });
    });

    describe('range conditions', () => {
        it('matches [min,max] range', () => {
            expect(choosePluralForm('[1,5] a few|[6,*] many', 3, 'en')).toBe('a few');
            expect(choosePluralForm('[1,5] a few|[6,*] many', 10, 'en')).toBe('many');
        });

        it('matches boundary values', () => {
            expect(choosePluralForm('[1,5] few|[6,10] some|[11,*] many', 1, 'en')).toBe('few');
            expect(choosePluralForm('[1,5] few|[6,10] some|[11,*] many', 5, 'en')).toBe('few');
            expect(choosePluralForm('[1,5] few|[6,10] some|[11,*] many', 6, 'en')).toBe('some');
            expect(choosePluralForm('[1,5] few|[6,10] some|[11,*] many', 11, 'en')).toBe('many');
        });

        it('matches [*,n] range', () => {
            expect(choosePluralForm('[*,5] up to five|[6,*] more', 3, 'en')).toBe('up to five');
            expect(choosePluralForm('[*,5] up to five|[6,*] more', 7, 'en')).toBe('more');
        });
    });

    describe('complex Laravel-style strings', () => {
        it('handles common Laravel pattern', () => {
            const str = '{0} No items|{1} One item|[2,*] :count items';
            expect(choosePluralForm(str, 0, 'en')).toBe('No items');
            expect(choosePluralForm(str, 1, 'en')).toBe('One item');
            expect(choosePluralForm(str, 5, 'en')).toBe(':count items');
        });

        it('falls back to last segment when no match', () => {
            const str = '{0} zero|{1} one';
            expect(choosePluralForm(str, 5, 'en')).toBe('one');
        });
    });

    describe('French locale (0 and 1 are singular)', () => {
        it('returns first form for count=0', () => {
            expect(choosePluralForm('article|articles', 0, 'fr')).toBe('article');
        });

        it('returns first form for count=1', () => {
            expect(choosePluralForm('article|articles', 1, 'fr')).toBe('article');
        });

        it('returns second form for count>1', () => {
            expect(choosePluralForm('article|articles', 2, 'fr')).toBe('articles');
            expect(choosePluralForm('article|articles', 100, 'fr')).toBe('articles');
        });
    });

    describe('Russian locale (3 forms)', () => {
        it('returns first form for numbers ending in 1 (not 11)', () => {
            expect(choosePluralForm('яблоко|яблока|яблок', 1, 'ru')).toBe('яблоко');
            expect(choosePluralForm('яблоко|яблока|яблок', 21, 'ru')).toBe('яблоко');
            expect(choosePluralForm('яблоко|яблока|яблок', 31, 'ru')).toBe('яблоко');
            expect(choosePluralForm('яблоко|яблока|яблок', 101, 'ru')).toBe('яблоко');
        });

        it('returns second form for numbers ending in 2-4 (not 12-14)', () => {
            expect(choosePluralForm('яблоко|яблока|яблок', 2, 'ru')).toBe('яблока');
            expect(choosePluralForm('яблоко|яблока|яблок', 3, 'ru')).toBe('яблока');
            expect(choosePluralForm('яблоко|яблока|яблок', 4, 'ru')).toBe('яблока');
            expect(choosePluralForm('яблоко|яблока|яблок', 22, 'ru')).toBe('яблока');
            expect(choosePluralForm('яблоко|яблока|яблок', 23, 'ru')).toBe('яблока');
        });

        it('returns third form for other numbers', () => {
            expect(choosePluralForm('яблоко|яблока|яблок', 0, 'ru')).toBe('яблок');
            expect(choosePluralForm('яблоко|яблока|яблок', 5, 'ru')).toBe('яблок');
            expect(choosePluralForm('яблоко|яблока|яблок', 11, 'ru')).toBe('яблок');
            expect(choosePluralForm('яблоко|яблока|яблок', 12, 'ru')).toBe('яблок');
            expect(choosePluralForm('яблоко|яблока|яблок', 14, 'ru')).toBe('яблок');
            expect(choosePluralForm('яблоко|яблока|яблок', 100, 'ru')).toBe('яблок');
        });
    });

    describe('Japanese locale (single form)', () => {
        it('always returns first form', () => {
            expect(choosePluralForm('アイテム|items', 0, 'ja')).toBe('アイテム');
            expect(choosePluralForm('アイテム|items', 1, 'ja')).toBe('アイテム');
            expect(choosePluralForm('アイテム|items', 5, 'ja')).toBe('アイテム');
            expect(choosePluralForm('アイテム|items', 100, 'ja')).toBe('アイテム');
        });
    });

    describe('default locale', () => {
        it('uses English as default when no locale specified', () => {
            expect(choosePluralForm('item|items', 1)).toBe('item');
            expect(choosePluralForm('item|items', 0)).toBe('items');
            expect(choosePluralForm('item|items', 5)).toBe('items');
        });
    });

    describe('edge cases', () => {
        it('returns original string when empty', () => {
            expect(choosePluralForm('', 5, 'en')).toBe('');
        });

        it('handles unknown locale by returning index 0', () => {
            expect(choosePluralForm('one|many', 5, 'unknown')).toBe('one');
        });
    });
});
