/**
 * Real-time IME for Singlish input.
 */
export interface ResolveResult {
    /** Sinhala text to commit (may be empty if nothing is committable yet) */
    toCommit: string;
    /** Remaining Roman buffer (ambiguous tail that could extend further) */
    remaining: string;
}
export declare function resolveBuffer(buffer: string): ResolveResult;
export interface IMEState {
    committed: string;
    pending: string;
}
export declare class SinglishIME {
    private buffer;
    getBuffer(): string;
    getSpeculativeDisplay(): string;
    processKey(key: string): ResolveResult;
    backspace(): boolean;
    flush(): string;
    hasPending(): boolean;
    reset(): void;
}
