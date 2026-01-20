import { describe, it, expect } from 'vitest';
import { getPluralIndex } from '../pluralRules';

/**
 * These tests verify that the JavaScript getPluralIndex function
 * produces identical results to Laravel's MessageSelector::getPluralIndex()
 *
 * @see vendor/laravel/framework/src/Illuminate/Translation/MessageSelector.php
 */

describe('getPluralIndex - locale-specific plural rules', () => {
    describe('Category 1: Single form languages (always returns 0)', () => {
        const locales = [
            'az',
            'az_AZ',
            'bo',
            'bo_CN',
            'bo_IN',
            'dz',
            'dz_BT',
            'id',
            'id_ID',
            'ja',
            'ja_JP',
            'jv',
            'ka',
            'ka_GE',
            'km',
            'km_KH',
            'kn',
            'kn_IN',
            'ko',
            'ko_KR',
            'ms',
            'ms_MY',
            'th',
            'th_TH',
            'tr',
            'tr_CY',
            'tr_TR',
            'vi',
            'vi_VN',
            'zh',
            'zh_CN',
            'zh_HK',
            'zh_SG',
            'zh_TW',
        ];

        locales.forEach((locale) => {
            it(`${locale}: always returns 0`, () => {
                [0, 1, 2, 5, 10, 11, 21, 100].forEach((n) => {
                    expect(getPluralIndex(locale, n)).toBe(0);
                });
            });
        });
    });

    describe('Category 2: Two forms - singular at 1 (English-like)', () => {
        const locales = [
            'en',
            'en_US',
            'en_GB',
            'en-US',
            'en-CA',
            'de',
            'de_DE',
            'es',
            'es_ES',
            'es-MX',
            'it',
            'it_IT',
            'pt',
            'pt_BR',
            'pt-BR',
            'nl',
            'nl_NL',
            'sv',
            'sv_SE',
        ];

        locales.forEach((locale) => {
            it(`${locale}: returns 0 for 1, returns 1 for other numbers`, () => {
                expect(getPluralIndex(locale, 1)).toBe(0);
                expect(getPluralIndex(locale, 0)).toBe(1);
                expect(getPluralIndex(locale, 2)).toBe(1);
                expect(getPluralIndex(locale, 5)).toBe(1);
                expect(getPluralIndex(locale, 21)).toBe(1);
                expect(getPluralIndex(locale, 100)).toBe(1);
            });
        });
    });

    describe('Category 3: Two forms - singular at 0 and 1 (French-like)', () => {
        const locales = ['fr', 'fr_FR', 'fr_CA', 'fr_BE', 'fr-CA', 'hi', 'hi_IN', 'am', 'am_ET'];

        locales.forEach((locale) => {
            it(`${locale}: returns 0 for 0 or 1, returns 1 for other numbers`, () => {
                expect(getPluralIndex(locale, 0)).toBe(0);
                expect(getPluralIndex(locale, 1)).toBe(0);
                expect(getPluralIndex(locale, 2)).toBe(1);
                expect(getPluralIndex(locale, 5)).toBe(1);
                expect(getPluralIndex(locale, 100)).toBe(1);
            });
        });
    });

    describe('Category 4: Three forms - Slavic languages (Russian, Ukrainian, etc.)', () => {
        const locales = ['ru', 'ru_RU', 'uk', 'uk_UA', 'be', 'be_BY', 'hr', 'hr_HR', 'sr', 'sr_RS', 'bs', 'bs_BA'];

        locales.forEach((locale) => {
            it(`${locale}: handles complex Slavic plural rules`, () => {
                // Form 0: ends in 1 but not 11
                expect(getPluralIndex(locale, 1)).toBe(0);
                expect(getPluralIndex(locale, 21)).toBe(0);
                expect(getPluralIndex(locale, 31)).toBe(0);
                expect(getPluralIndex(locale, 41)).toBe(0);
                expect(getPluralIndex(locale, 101)).toBe(0);
                expect(getPluralIndex(locale, 121)).toBe(0);

                // Form 1: ends in 2-4 but not 12-14
                expect(getPluralIndex(locale, 2)).toBe(1);
                expect(getPluralIndex(locale, 3)).toBe(1);
                expect(getPluralIndex(locale, 4)).toBe(1);
                expect(getPluralIndex(locale, 22)).toBe(1);
                expect(getPluralIndex(locale, 23)).toBe(1);
                expect(getPluralIndex(locale, 24)).toBe(1);
                expect(getPluralIndex(locale, 102)).toBe(1);

                // Form 2: everything else (0, 5-20, 25-30, etc.)
                expect(getPluralIndex(locale, 0)).toBe(2);
                expect(getPluralIndex(locale, 5)).toBe(2);
                expect(getPluralIndex(locale, 6)).toBe(2);
                expect(getPluralIndex(locale, 10)).toBe(2);
                expect(getPluralIndex(locale, 11)).toBe(2);
                expect(getPluralIndex(locale, 12)).toBe(2);
                expect(getPluralIndex(locale, 13)).toBe(2);
                expect(getPluralIndex(locale, 14)).toBe(2);
                expect(getPluralIndex(locale, 15)).toBe(2);
                expect(getPluralIndex(locale, 19)).toBe(2);
                expect(getPluralIndex(locale, 20)).toBe(2);
                expect(getPluralIndex(locale, 100)).toBe(2);
                expect(getPluralIndex(locale, 111)).toBe(2);
                expect(getPluralIndex(locale, 112)).toBe(2);
            });
        });
    });

    describe('Category 5: Three forms - Czech/Slovak', () => {
        const locales = ['cs', 'cs_CZ', 'sk', 'sk_SK'];

        locales.forEach((locale) => {
            it(`${locale}: 1 -> 0, 2-4 -> 1, else -> 2`, () => {
                expect(getPluralIndex(locale, 1)).toBe(0);

                expect(getPluralIndex(locale, 2)).toBe(1);
                expect(getPluralIndex(locale, 3)).toBe(1);
                expect(getPluralIndex(locale, 4)).toBe(1);

                expect(getPluralIndex(locale, 0)).toBe(2);
                expect(getPluralIndex(locale, 5)).toBe(2);
                expect(getPluralIndex(locale, 10)).toBe(2);
                expect(getPluralIndex(locale, 100)).toBe(2);
            });
        });
    });

    describe('Category 6: Three forms - Polish', () => {
        it('pl: handles Polish plural rules', () => {
            // Form 0: exactly 1
            expect(getPluralIndex('pl', 1)).toBe(0);

            // Form 1: ends in 2-4 but not 12-14
            expect(getPluralIndex('pl', 2)).toBe(1);
            expect(getPluralIndex('pl', 3)).toBe(1);
            expect(getPluralIndex('pl', 4)).toBe(1);
            expect(getPluralIndex('pl', 22)).toBe(1);
            expect(getPluralIndex('pl', 23)).toBe(1);
            expect(getPluralIndex('pl', 24)).toBe(1);

            // Form 2: everything else
            expect(getPluralIndex('pl', 0)).toBe(2);
            expect(getPluralIndex('pl', 5)).toBe(2);
            expect(getPluralIndex('pl', 12)).toBe(2);
            expect(getPluralIndex('pl', 13)).toBe(2);
            expect(getPluralIndex('pl', 14)).toBe(2);
            expect(getPluralIndex('pl', 100)).toBe(2);
        });
    });

    describe('Category 7: Three forms - Lithuanian', () => {
        it('lt: handles Lithuanian plural rules', () => {
            // Form 0: ends in 1 but not 11
            expect(getPluralIndex('lt', 1)).toBe(0);
            expect(getPluralIndex('lt', 21)).toBe(0);
            expect(getPluralIndex('lt', 31)).toBe(0);

            // Form 1: ends in 2-9 but not 12-19
            expect(getPluralIndex('lt', 2)).toBe(1);
            expect(getPluralIndex('lt', 9)).toBe(1);
            expect(getPluralIndex('lt', 22)).toBe(1);

            // Form 2: everything else
            expect(getPluralIndex('lt', 0)).toBe(2);
            expect(getPluralIndex('lt', 10)).toBe(2);
            expect(getPluralIndex('lt', 11)).toBe(2);
            expect(getPluralIndex('lt', 12)).toBe(2);
            expect(getPluralIndex('lt', 19)).toBe(2);
        });
    });

    describe('Category 8: Three forms - Latvian', () => {
        it('lv: handles Latvian plural rules', () => {
            // Form 0: exactly 0
            expect(getPluralIndex('lv', 0)).toBe(0);

            // Form 1: ends in 1 but not 11
            expect(getPluralIndex('lv', 1)).toBe(1);
            expect(getPluralIndex('lv', 21)).toBe(1);
            expect(getPluralIndex('lv', 31)).toBe(1);

            // Form 2: everything else
            expect(getPluralIndex('lv', 2)).toBe(2);
            expect(getPluralIndex('lv', 11)).toBe(2);
            expect(getPluralIndex('lv', 100)).toBe(2);
        });
    });

    describe('Category 9: Three forms - Romanian', () => {
        it('ro: handles Romanian plural rules', () => {
            // Form 0: exactly 1
            expect(getPluralIndex('ro', 1)).toBe(0);

            // Form 1: 0 or n%100 in 1-19
            expect(getPluralIndex('ro', 0)).toBe(1);
            expect(getPluralIndex('ro', 2)).toBe(1);
            expect(getPluralIndex('ro', 19)).toBe(1);
            expect(getPluralIndex('ro', 101)).toBe(1);
            expect(getPluralIndex('ro', 119)).toBe(1);

            // Form 2: everything else
            expect(getPluralIndex('ro', 20)).toBe(2);
            expect(getPluralIndex('ro', 100)).toBe(2);
        });
    });

    describe('Category 10: Three forms - Irish', () => {
        it('ga: handles Irish plural rules', () => {
            expect(getPluralIndex('ga', 1)).toBe(0);
            expect(getPluralIndex('ga', 2)).toBe(1);
            expect(getPluralIndex('ga', 3)).toBe(2);
            expect(getPluralIndex('ga', 5)).toBe(2);
        });
    });

    describe('Category 11: Four forms - Slovenian', () => {
        it('sl: handles Slovenian 4-form plural rules', () => {
            // Form 0: n%100 == 1
            expect(getPluralIndex('sl', 1)).toBe(0);
            expect(getPluralIndex('sl', 101)).toBe(0);
            expect(getPluralIndex('sl', 201)).toBe(0);

            // Form 1: n%100 == 2
            expect(getPluralIndex('sl', 2)).toBe(1);
            expect(getPluralIndex('sl', 102)).toBe(1);
            expect(getPluralIndex('sl', 202)).toBe(1);

            // Form 2: n%100 == 3 or 4
            expect(getPluralIndex('sl', 3)).toBe(2);
            expect(getPluralIndex('sl', 4)).toBe(2);
            expect(getPluralIndex('sl', 103)).toBe(2);
            expect(getPluralIndex('sl', 104)).toBe(2);

            // Form 3: everything else
            expect(getPluralIndex('sl', 0)).toBe(3);
            expect(getPluralIndex('sl', 5)).toBe(3);
            expect(getPluralIndex('sl', 10)).toBe(3);
            expect(getPluralIndex('sl', 100)).toBe(3);
        });
    });

    describe('Category 12: Four forms - Maltese', () => {
        it('mt: handles Maltese 4-form plural rules', () => {
            // Form 0: n == 1
            expect(getPluralIndex('mt', 1)).toBe(0);

            // Form 1: n == 0 or n%100 in 2-10
            expect(getPluralIndex('mt', 0)).toBe(1);
            expect(getPluralIndex('mt', 2)).toBe(1);
            expect(getPluralIndex('mt', 10)).toBe(1);

            // Form 2: n%100 in 11-19
            expect(getPluralIndex('mt', 11)).toBe(2);
            expect(getPluralIndex('mt', 19)).toBe(2);

            // Form 3: everything else
            expect(getPluralIndex('mt', 20)).toBe(3);
            expect(getPluralIndex('mt', 100)).toBe(3);
        });
    });

    describe('Category 13: Four forms - Welsh', () => {
        it('cy: handles Welsh 4-form plural rules', () => {
            expect(getPluralIndex('cy', 1)).toBe(0);
            expect(getPluralIndex('cy', 2)).toBe(1);
            expect(getPluralIndex('cy', 8)).toBe(2);
            expect(getPluralIndex('cy', 11)).toBe(2);
            expect(getPluralIndex('cy', 3)).toBe(3);
            expect(getPluralIndex('cy', 5)).toBe(3);
        });
    });

    describe('Category 14: Six forms - Arabic', () => {
        const locales = ['ar', 'ar_SA', 'ar_EG', 'ar_AE'];

        locales.forEach((locale) => {
            it(`${locale}: handles 6-form Arabic plural rules`, () => {
                // Form 0: n == 0
                expect(getPluralIndex(locale, 0)).toBe(0);

                // Form 1: n == 1
                expect(getPluralIndex(locale, 1)).toBe(1);

                // Form 2: n == 2
                expect(getPluralIndex(locale, 2)).toBe(2);

                // Form 3: n%100 in 3-10
                expect(getPluralIndex(locale, 3)).toBe(3);
                expect(getPluralIndex(locale, 10)).toBe(3);
                expect(getPluralIndex(locale, 103)).toBe(3);

                // Form 4: n%100 in 11-99
                expect(getPluralIndex(locale, 11)).toBe(4);
                expect(getPluralIndex(locale, 99)).toBe(4);
                expect(getPluralIndex(locale, 111)).toBe(4);

                // Form 5: everything else (100, 200, etc.)
                expect(getPluralIndex(locale, 100)).toBe(5);
                expect(getPluralIndex(locale, 200)).toBe(5);
            });
        });
    });

    describe('Category 15: Macedonian', () => {
        it('mk: returns 0 if n%10 == 1, else 1', () => {
            expect(getPluralIndex('mk', 1)).toBe(0);
            expect(getPluralIndex('mk', 11)).toBe(0);
            expect(getPluralIndex('mk', 21)).toBe(0);

            expect(getPluralIndex('mk', 0)).toBe(1);
            expect(getPluralIndex('mk', 2)).toBe(1);
            expect(getPluralIndex('mk', 10)).toBe(1);
        });
    });

    describe('Unknown locale fallback', () => {
        it('returns 0 for completely unknown locales', () => {
            expect(getPluralIndex('xx', 0)).toBe(0);
            expect(getPluralIndex('unknown', 5)).toBe(0);
            expect(getPluralIndex('zzz_ZZZ', 100)).toBe(0);
        });
    });

    describe('Edge cases', () => {
        it('handles negative numbers', () => {
            // JavaScript % operator preserves sign, so -1 % 10 = -1
            // The rules may behave unexpectedly with negatives, but they shouldn't crash
            expect(() => getPluralIndex('en', -1)).not.toThrow();
            expect(() => getPluralIndex('ru', -5)).not.toThrow();
        });

        it('handles large numbers', () => {
            expect(getPluralIndex('en', 1000000)).toBe(1);
            expect(getPluralIndex('ru', 1000001)).toBe(0); // ends in 1, not 11
            expect(getPluralIndex('ru', 1000002)).toBe(1); // ends in 2
        });

        it('handles decimal numbers by truncating', () => {
            // In practice, count should be an integer, but we test for robustness
            expect(getPluralIndex('en', 1.5)).toBe(1); // 1.5 !== 1
            expect(getPluralIndex('en', 1.0)).toBe(0); // 1.0 === 1
        });
    });
});
