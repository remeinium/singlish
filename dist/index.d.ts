export { convertSinglishToSinhala, convertWithMetadata, convertLastWord, isSinhalaChar, containsSinhala, segmentText, VOWELS, VOWEL_MODIFIERS_MAP, CONSONANTS, SPECIAL, HAL_CHAR, ZWJ_CHAR, } from './converter';
export { useSinglishConverter } from './hooks';
export { SinglishIME, resolveBuffer } from './ime-engine';
export type { IMEState, ResolveResult } from './ime-engine';
export type { ConversionOptions, ConversionResult, SinglishTextareaInputProps, UseSinglishConverterOptions, UseSinglishConverterReturn, } from './types';
