/**
 * Core Singlish to Sinhala conversion logic.
 *
 * Approaches conversion in two steps:
 * 1. Tokenize Singlish -> Phonemes (greedy matching)
 * 2. Phonemes -> Sinhala Unicode (context aware)
 */

import type { ConversionOptions, ConversionResult } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const HAL = '\u0DCA'; // ්  (al-lakuna / virama)
const ZWJ = '\u200D'; // Zero-width joiner for conjuncts (yaksha, rakaransaya)

// =============================================================================
// SINGLISH → PHONEME MAPPINGS
// =============================================================================

/**
 * Singlish pattern definitions.
 * Ordered by length (descending) for the greedy tokenizer.
 */
const SINGLISH_TO_PHONEME: ReadonlyArray<readonly [string, string]> = [
    // 4-character patterns
    ['zdha', 'SANYAKA_DHA'],

    // 3-character patterns 
    ['chh', 'ASPIRATED_CH'],
    ['thh', 'ASPIRATED_TH'],
    ['dhh', 'ASPIRATED_DH'],

    ['zga', 'SANYAKA_GA'],
    ['zja', 'SANYAKA_JA'],
    ['zda', 'SANYAKA_DA'],
    ['zqa', 'SANYAKA_DHA'],
    ['zka', 'SANYAKA_KA'],
    ['zha', 'SANYAKA_HA'],

    // 2-character patterns
    ['aa', 'V_AA'],
    ['Aa', 'V_AE_LONG'],
    ['AA', 'V_AE_LONG'],
    ['ai', 'V_AI'],
    ['au', 'V_AU'],
    ['ou', 'V_AU'],
    ['ii', 'V_II'],
    ['uu', 'V_UU'],
    ['ee', 'V_EE'],
    ['oo', 'V_OO'],
    ['Ru', 'V_RU_LONG'],
    ['Lu', 'SPECIAL_LU'],
    ['kh', 'KH'],
    ['gh', 'GH'],
    ['ch', 'CH'],
    ['ph', 'PH'],
    ['bh', 'BH'],
    ['th', 'TH'],
    ['dh', 'DH'],
    ['Sh', 'RETROFLEX_S'],
    ['sh', 'SH'],
    ['ng', 'N_G'],
    ['Th', 'RETROFLEX_TH'],
    ['Dh', 'RETROFLEX_DH'],
    ['Ba', 'SANYAKA_BA'],

    // Single character patterns
    ['a', 'V_A'],
    ['A', 'V_AE'],
    ['i', 'V_I'],
    ['u', 'V_U'],
    ['U', 'V_UU'],
    ['e', 'V_E'],
    ['E', 'V_EE'],
    ['o', 'V_O'],
    ['O', 'V_OO'],
    ['R', 'V_RU'],
    ['k', 'K'],
    ['g', 'G'],
    ['j', 'J'],
    ['t', 'RETROFLEX_T'],
    ['d', 'RETROFLEX_D'],
    ['T', 'RETROFLEX_TH_SINGLE'],
    ['D', 'RETROFLEX_DH_SINGLE'],
    ['n', 'N'],
    ['N', 'RETROFLEX_N'],
    ['p', 'P'],
    ['b', 'B_LOWER'],
    ['B', 'SANYAKA_B'],
    ['m', 'M'],
    ['y', 'Y'],
    ['r', 'R_CONS'],
    ['l', 'L_CONS'],
    ['L', 'RETROFLEX_L'],
    ['v', 'V_CONS'],
    ['w', 'V_CONS'],
    ['s', 'S_CONS'],
    ['S', 'RETROFLEX_S'],
    ['h', 'H_CONS'],
    ['f', 'F'],
    ['q', 'DH'],
    ['x', 'ANUSVARA'],
    ['X', 'MAHAPRANAANUSVARA'],
    ['H', 'VISARGA'],

    // Preserve these characters
    [' ', ' '],
    ['\n', '\n'],
    ['\t', '\t'],
    [':', ':'],
    [';', ';'],
    ['.', '.'],
    ['-', '-'],
    [',', ','],
    ['/', '/'],
    ['?', '?'],
    ['!', '!'],
    ['(', '('],
    [')', ')'],
    ['[', '['],
    [']', ']'],
    ['"', '"'],
    ["'", "'"],
    ['0', '0'],
    ['1', '1'],
    ['2', '2'],
    ['3', '3'],
    ['4', '4'],
    ['5', '5'],
    ['6', '6'],
    ['7', '7'],
    ['8', '8'],
    ['9', '9'],
];

// =============================================================================
// PHONEME CLASSIFICATION & SINHALA MAPPINGS
// =============================================================================

/** Consonant phonemes → Sinhala base character */
const CONSONANT_MAP: Record<string, string> = {
    'K': 'ක',
    'KH': 'ඛ',
    'G': 'ග',
    'GH': 'ඝ',
    'CH': 'ච',
    'ASPIRATED_CH': 'ඡ',
    'J': 'ජ',
    'RETROFLEX_T': 'ට',
    'RETROFLEX_TH': 'ඨ',
    'RETROFLEX_TH_SINGLE': 'ඨ',
    'RETROFLEX_D': 'ඩ',
    'RETROFLEX_DH': 'ඪ',
    'RETROFLEX_DH_SINGLE': 'ඪ',
    'RETROFLEX_N': 'ණ',
    'TH': 'ත',
    'ASPIRATED_TH': 'ථ',
    'DH': 'ද',
    'ASPIRATED_DH': 'ධ',
    'N': 'න',
    'P': 'ප',
    'PH': 'ඵ',
    'B_LOWER': 'බ',
    'BH': 'භ',
    'M': 'ම',
    'Y': 'ය',
    'R_CONS': 'ර',
    'L_CONS': 'ල',
    'RETROFLEX_L': 'ළ',
    'V_CONS': 'ව',
    'SH': 'ශ',
    'RETROFLEX_S': 'ෂ',
    'S_CONS': 'ස',
    'H_CONS': 'හ',
    'F': 'ෆ',
};

/** Set of all consonant phoneme tokens */
const CONSONANT_SET = new Set(Object.keys(CONSONANT_MAP));

/** Sanyaka consonants → Sinhala character */
const SANYAKA_MAP: Record<string, string> = {
    'SANYAKA_GA': 'ඟ',   // zga
    'SANYAKA_JA': 'ඦ',   // zja
    'SANYAKA_DA': 'ඬ',   // zda
    'SANYAKA_DHA': 'ඳ',  // zdha/zqa
    'SANYAKA_KA': 'ඤ',   // zka
    'SANYAKA_HA': 'ඥ',   // zha
    'SANYAKA_B': 'ඹ',    // B (standalone, gets hal at end)
    'SANYAKA_BA': 'ඹ',   // Ba (has inherent a from the 'a' in pattern)
};

const SANYAKA_SET = new Set(Object.keys(SANYAKA_MAP));

/** Standalone vowel phonemes → Sinhala character */
const VOWEL_STANDALONE: Record<string, string> = {
    'V_A': 'අ',
    'V_AA': 'ආ',
    'V_AE': 'ඇ',
    'V_AE_LONG': 'ඈ',
    'V_I': 'ඉ',
    'V_II': 'ඊ',
    'V_U': 'උ',
    'V_UU': 'ඌ',
    'V_RU': 'ඍ',
    'V_RU_LONG': 'ඎ',
    'V_E': 'එ',
    'V_EE': 'ඒ',
    'V_AI': 'ඓ',
    'V_O': 'ඔ',
    'V_OO': 'ඕ',
    'V_AU': 'ඖ',
};

/** 'Pillam' forms - applied after consonants */
const VOWEL_MODIFIER: Record<string, string> = {
    'V_AA': 'ා',
    'V_AE': 'ැ',
    'V_AE_LONG': 'ෑ',
    'V_I': 'ි',
    'V_II': 'ී',
    'V_U': 'ු',
    'V_UU': 'ූ',
    'V_E': 'ෙ',
    'V_EE': 'ේ',
    'V_AI': 'ෛ',
    'V_O': 'ො',
    'V_OO': 'ෝ',
    'V_AU': 'ෞ',
};

/** Set of all vowel tokens (standalone + modifiable) */
const VOWEL_SET = new Set(Object.keys(VOWEL_STANDALONE));

/** Set of vowels that can act as modifiers after consonants */
const VOWEL_MODIFIER_SET = new Set(Object.keys(VOWEL_MODIFIER));

/** Special non-consonant, non-vowel tokens */
const SPECIAL_MAP: Record<string, string> = {
    'ANUSVARA': 'ං',
    'MAHAPRANAANUSVARA': 'ඞ',
    'VISARGA': 'ඃ',
    'SPECIAL_LU': 'ළු',
};

/** "ng" special handling: n + g -> not sanyaka */
const N_G_TOKEN = 'N_G';

// =============================================================================
// HELPER PREDICATES
// =============================================================================

function isConsonant(token: string): boolean {
    return CONSONANT_SET.has(token);
}

function isSanyaka(token: string): boolean {
    return SANYAKA_SET.has(token);
}

function isVowel(token: string): boolean {
    return VOWEL_SET.has(token);
}

function isInherentA(token: string): boolean {
    return token === 'V_A';
}

function isVowelModifier(token: string): boolean {
    return VOWEL_MODIFIER_SET.has(token);
}

function isWordBoundary(token: string | undefined): boolean {
    if (token === undefined) return true;
    return [' ', '.', ',', '!', '?', ';', ':', '\n', '\t', '-', '/', '(', ')', '[', ']', '"', "'"].includes(token);
}

function isConjunctable(token: string): boolean {
    // Y and R_CONS can form conjuncts (yansaya / rakaransaya)
    return token === 'Y' || token === 'R_CONS';
}

// =============================================================================
// TOKENIZER
// =============================================================================

/**
 * Greedy tokenizer - Scan text and match against the SINGLISH_TO_PHONEME entries.
 */
function singlishToPhonemes(text: string): string[] {
    const phonemes: string[] = [];
    let i = 0;

    while (i < text.length) {
        let matched = false;

        // Match patterns (sorted by length, longest first)
        for (const [pattern, phoneme] of SINGLISH_TO_PHONEME) {
            const candidate = text.substring(i, i + pattern.length);
            if (candidate === pattern) {
                phonemes.push(phoneme);
                i += pattern.length;
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Unknown character - preserve it
            phonemes.push(text[i]);
            i++;
        }
    }

    return phonemes;
}

// =============================================================================
// PHONEMES TO SINHALA
// =============================================================================

/**
 * Convert phoneme tokens to actual Sinhala chars.
 * Handles context-dependent rendering (inherent vowels, modifiers, hal, conjuncts).
 */
function phonemesToSinhala(phonemes: string[]): string {
    const output: string[] = [];
    let i = 0;

    while (i < phonemes.length) {
        const current = phonemes[i];
        const next = phonemes[i + 1];

        // --- Special tokens ---

        // Special: ANUSVARA, VISARGA, MAHAPRANAANUSVARA, SPECIAL_LU
        if (SPECIAL_MAP[current] !== undefined) {
            output.push(SPECIAL_MAP[current]);
            i++;
            continue;
        }

        // Special case: 'ng' is න් + ග (not a sanyaka)
        if (current === N_G_TOKEN) {
            const nChar = CONSONANT_MAP['N']; // න
            const gChar = CONSONANT_MAP['G']; // ග

            // Check what follows the 'ng' 
            if (next !== undefined && isVowelModifier(next)) {
                // ng + vowel → න් + ග + vowel_sign
                output.push(nChar + HAL);
                output.push(gChar);
                output.push(VOWEL_MODIFIER[next]);
                i += 2;
            } else if (next !== undefined && isInherentA(next)) {
                output.push(nChar + HAL);
                output.push(gChar);
                i += 2;
            } else if (next !== undefined && isConsonant(next)) {
                output.push(nChar + HAL);
                output.push(gChar + HAL);
                i++;
            } else {
                output.push(nChar + HAL);
                output.push(gChar + HAL);
                i++;
            }
            continue;
        }

        // --- Standalone vowels ---
        if (isVowel(current) && !isConsonant(current)) {
            output.push(VOWEL_STANDALONE[current]);
            i++;
            continue;
        }

        // --- Sanyaka consonants ---
        if (isSanyaka(current)) {
            const sanyakaChar = SANYAKA_MAP[current];

            if (current === 'SANYAKA_B') {
                // Standalone B - no inherent 'a' consumed
                // Check what follows
                if (next !== undefined && isVowelModifier(next)) {
                    output.push(sanyakaChar);
                    output.push(VOWEL_MODIFIER[next]);
                    i += 2;
                } else if (next !== undefined && isInherentA(next)) {
                    output.push(sanyakaChar);
                    i += 2;
                } else if (next !== undefined && (isConsonant(next) || isSanyaka(next))) {
                    output.push(sanyakaChar + HAL);
                    i++;
                } else {
                    // At word end → hal
                    output.push(sanyakaChar + HAL);
                    i++;
                }
            } else if (current === 'SANYAKA_BA') {
                // 'Ba' pattern - 'a' already consumed, output with inherent vowel
                output.push(sanyakaChar);
                i++;
            } else {
                // Other sanyaka (zga, zja, etc.) - the singlish patterns end with 'a'
                output.push(sanyakaChar);
                i++;
            }
            continue;
        }

        // --- Regular consonants ---
        if (isConsonant(current)) {
            const consonantChar = CONSONANT_MAP[current];

            // Check for conjuncts: consonant + Y/R_CONS
            // This produces yansaya (ක්‍ය) or rakaransaya (ක්‍ර)
            if (next !== undefined && isConjunctable(next)) {
                const afterConjunct = phonemes[i + 2];
                const conjunctChar = CONSONANT_MAP[next];

                // Special : consonant + R_CONS + V_U → rakaransaya ෘ sign
                if (next === 'R_CONS' && afterConjunct === 'V_U') {
                    output.push(consonantChar + '\u0DD8'); // ෘ
                    i += 3;
                    continue;
                }

                // Special : consonant + R_CONS + V_UU → rakaransaya ෲ sign
                if (next === 'R_CONS' && afterConjunct === 'V_UU') {
                    output.push(consonantChar + '\u0DF2'); // ෲ
                    i += 3;
                    continue;
                }

                // General conjunct: consonant + hal + ZWJ + Y/R + vowel handling
                if (afterConjunct !== undefined && isVowelModifier(afterConjunct)) {
                    // e.g., kraa → ක්‍රා
                    output.push(consonantChar + HAL + ZWJ + conjunctChar);
                    output.push(VOWEL_MODIFIER[afterConjunct]);
                    i += 3;
                    continue;
                } else if (afterConjunct !== undefined && isInherentA(afterConjunct)) {
                    // e.g., kra → ක්‍ර, kya → ක්‍ය (inherent a)
                    output.push(consonantChar + HAL + ZWJ + conjunctChar);
                    i += 3;
                    continue;
                } else if (afterConjunct !== undefined && (isConsonant(afterConjunct) || isSanyaka(afterConjunct) || afterConjunct === N_G_TOKEN)) {
                    // Conjunct followed by another consonant
                    output.push(consonantChar + HAL + ZWJ + conjunctChar + HAL);
                    i += 2;
                    continue;
                } else {
                    // Conjunct at word end
                    output.push(consonantChar + HAL + ZWJ + conjunctChar + HAL);
                    i += 2;
                    continue;
                }
            }

            // Consonant + vowel modifier → consonant with pili
            if (next !== undefined && isVowelModifier(next)) {
                output.push(consonantChar);
                output.push(VOWEL_MODIFIER[next]);
                i += 2;
                continue;
            }

            // Consonant + inherent 'a' → just consonant (inherent vowel)
            if (next !== undefined && isInherentA(next)) {
                output.push(consonantChar);
                i += 2;
                continue;
            }

            // Consonant + another consonant → add hal (virama)
            if (next !== undefined && (isConsonant(next) || isSanyaka(next) || next === N_G_TOKEN)) {
                output.push(consonantChar + HAL);
                i++;
                continue;
            }

            // Consonant at word end or before punctuation → add hal
            if (isWordBoundary(next) || next === undefined) {
                output.push(consonantChar + HAL);
                i++;
                continue;
            }

            // Consonant + special (anusvara, visarga, etc.)
            if (next !== undefined && SPECIAL_MAP[next] !== undefined) {
                output.push(consonantChar);
                i++;
                continue;
            }

            // Default: output consonant (shouldn't normally reach here)
            output.push(consonantChar);
            i++;
            continue;
        }

        // --- Passthrough (punctuation, numbers, unknown) ---
        output.push(current);
        i++;
    }

    return output.join('');
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Main conversion function: Singlish → Sinhala
 */
export function convertSinglishToSinhala(
    text: string,
    _options?: ConversionOptions
): string {
    if (!text) return text;

    const phonemes = singlishToPhonemes(text);
    return phonemesToSinhala(phonemes);
}

/**
 * Convert only the last word (for real-time typing)
 */
export function convertLastWord(
    text: string,
    options?: ConversionOptions
): string {
    if (!text) return text;

    let lastBoundary = -1;
    for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === ' ' || text[i] === '\n') {
            lastBoundary = i;
            break;
        }
    }

    if (lastBoundary === -1) {
        return convertSinglishToSinhala(text, options);
    }

    const prefix = text.substring(0, lastBoundary + 1);
    const lastWord = text.substring(lastBoundary + 1);

    if (!lastWord) return text;

    return prefix + convertSinglishToSinhala(lastWord, options);
}

/**
 * Convert with metadata
 */
export function convertWithMetadata(
    text: string,
    options?: ConversionOptions
): ConversionResult {
    const original = text;
    const converted = convertSinglishToSinhala(text, options);

    let conversions = 0;
    for (let i = 0; i < Math.min(original.length, converted.length); i++) {
        if (original[i] !== converted[i]) conversions++;
    }

    return { text: converted, original, conversions };
}

/**
 * Check if character is Sinhala
 */
export function isSinhalaChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 0x0D80 && code <= 0x0DFF;
}

/**
 * Check if text contains Sinhala
 */
export function containsSinhala(text: string): boolean {
    for (const char of text) {
        if (isSinhalaChar(char)) return true;
    }
    return false;
}

/**
 * Segment text into Sinhala and non-Sinhala parts
 */
export function segmentText(text: string): Array<{ text: string; isSinhala: boolean }> {
    const segments: Array<{ text: string; isSinhala: boolean }> = [];
    let currentSegment = '';
    let currentIsSinhala: boolean | null = null;

    for (const char of text) {
        const charIsSinhala = isSinhalaChar(char);
        if (currentIsSinhala === null) currentIsSinhala = charIsSinhala;

        if (charIsSinhala === currentIsSinhala) {
            currentSegment += char;
        } else {
            if (currentSegment) {
                segments.push({ text: currentSegment, isSinhala: currentIsSinhala });
            }
            currentSegment = char;
            currentIsSinhala = charIsSinhala;
        }
    }

    if (currentSegment && currentIsSinhala !== null) {
        segments.push({ text: currentSegment, isSinhala: currentIsSinhala });
    }

    return segments;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const VOWELS = VOWEL_STANDALONE;
export const VOWEL_MODIFIERS_MAP = VOWEL_MODIFIER_SET;
export const CONSONANTS = CONSONANT_SET;
export const SPECIAL = { 'x': 'ං', 'H': 'ඃ' };
export const HAL_CHAR = HAL;
export const ZWJ_CHAR = ZWJ;
