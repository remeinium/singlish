/**
 * Core Singlish to Sinhala conversion logic.
 *
 * Approaches conversion in two steps:
 * 1. Tokenize Singlish -> Phonemes (greedy matching)
 * 2. Phonemes -> Sinhala Unicode (context aware)
 */
import type { ConversionOptions, ConversionResult } from './types';
/**
 * Main conversion function: Singlish → Sinhala
 */
export declare function convertSinglishToSinhala(text: string, _options?: ConversionOptions): string;
/**
 * Convert only the last word (for real-time typing)
 */
export declare function convertLastWord(text: string, options?: ConversionOptions): string;
/**
 * Convert with metadata
 */
export declare function convertWithMetadata(text: string, options?: ConversionOptions): ConversionResult;
/**
 * Check if character is Sinhala
 */
export declare function isSinhalaChar(char: string): boolean;
/**
 * Check if text contains Sinhala
 */
export declare function containsSinhala(text: string): boolean;
/**
 * Segment text into Sinhala and non-Sinhala parts
 */
export declare function segmentText(text: string): Array<{
    text: string;
    isSinhala: boolean;
}>;
export declare const VOWELS: Record<string, string>;
export declare const VOWEL_MODIFIERS_MAP: Set<string>;
export declare const CONSONANTS: Set<string>;
export declare const SPECIAL: {
    x: string;
    H: string;
};
export declare const HAL_CHAR = "\u0DCA";
export declare const ZWJ_CHAR = "\u200D";
