


export {
    convertSinglishToSinhala,
    convertWithMetadata,
    convertLastWord,
    isSinhalaChar,
    containsSinhala,
    segmentText,
    // Character mappings (for advanced usage)
    VOWELS,
    VOWEL_MODIFIERS_MAP,
    CONSONANTS,
    SPECIAL,
    HAL_CHAR,
    ZWJ_CHAR,
} from './converter';


export { useSinglishConverter } from './hooks';


export { SinglishIME, resolveBuffer } from './ime-engine';
export type { IMEState, ResolveResult } from './ime-engine';

export { createAutoAttach } from './auto-attach';
export { createUIToggle } from './ui-toggle';


export type {
    ConversionOptions,
    ConversionResult,
    SinglishTextareaInputProps,
    UseSinglishConverterOptions,
    UseSinglishConverterReturn,
    AutoAttachOptions,
    AutoAttachInstance,
    UIToggleOptions,
    UIToggleInstance,
} from './types';

