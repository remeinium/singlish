/**
 * Real-time IME for Singlish input.
 */

import { convertSinglishToSinhala } from './converter';

// Prefix trie

interface TrieNode {
    children: Map<string, TrieNode>;
    isTerminal: boolean;
}

function createTrieNode(): TrieNode {
    return { children: new Map(), isTerminal: false };
}

const SINGLISH_PATTERNS: readonly string[] = [
    // 4-char
    'zdha',
    // 3-char
    'chh', 'thh', 'dhh',
    'zga', 'zja', 'zda', 'zqa', 'zka', 'zha',
    // 2-char
    'aa', 'Aa', 'AA', 'ai', 'au', 'ou', 'ii', 'uu', 'ee', 'oo',
    'Ru', 'Lu',
    'kh', 'gh', 'ch', 'ph', 'bh', 'th', 'dh',
    'Sh', 'sh', 'ng',
    'Th', 'Dh', 'Ba',
    // 1-char
    'a', 'A', 'i', 'u', 'U', 'e', 'E', 'o', 'O', 'R',
    'k', 'g', 'j', 't', 'd', 'T', 'D',
    'n', 'N', 'p', 'b', 'B', 'm', 'y', 'r', 'l', 'L',
    'v', 'w', 's', 'S', 'h', 'f', 'q', 'x', 'X', 'H',
];

/**prefix trie once at module load */
const ROOT: TrieNode = buildTrie(SINGLISH_PATTERNS);

function buildTrie(patterns: readonly string[]): TrieNode {
    const root = createTrieNode();
    for (const pattern of patterns) {
        let node = root;
        for (const ch of pattern) {
            let child = node.children.get(ch);
            if (!child) {
                child = createTrieNode();
                node.children.set(ch, child);
            }
            node = child;
        }
        node.isTerminal = true;
    }
    return root;
}


function hasLongerPattern(str: string): boolean {
    if (str.length === 0) return true;
    let node: TrieNode = ROOT;
    for (const ch of str) {
        const child = node.children.get(ch);
        if (!child) return false;
        node = child;
    }
    return node.children.size > 0;
}


function isTriePrefix(str: string): boolean {
    if (str.length === 0) return true;
    let node: TrieNode = ROOT;
    for (const ch of str) {
        const child = node.children.get(ch);
        if (!child) return false;
        node = child;
    }
    return true; // reached end of str without falling off the trie
}


function longestMatchAt(buffer: string, pos: number): number {
    let node: TrieNode = ROOT;
    let lastMatchLen = 0;
    for (let i = pos; i < buffer.length; i++) {
        const child = node.children.get(buffer[i]);
        if (!child) break;
        node = child;
        if (node.isTerminal) {
            lastMatchLen = i - pos + 1;
        }
    }
    return lastMatchLen;
}

// Pattern classification


const CONSONANT_PATTERNS = new Set([
    'k', 'kh', 'g', 'gh', 'ch', 'chh', 'j',
    't', 'Th', 'd', 'Dh', 'T', 'D',
    'th', 'thh', 'dh', 'dhh',
    'n', 'N', 'p', 'ph', 'b', 'bh', 'B', 'Ba',
    'm', 'y', 'r', 'l', 'L', 'v', 'w',
    'sh', 'Sh', 'S', 's', 'h', 'f', 'q',
    'ng',
    'zga', 'zja', 'zda', 'zdha', 'zqa', 'zka', 'zha',
]);


const VOWEL_PATTERNS = new Set([
    'a', 'aa', 'A', 'Aa', 'AA',
    'i', 'ii', 'u', 'uu', 'U',
    'e', 'ee', 'E', 'o', 'oo', 'O',
    'ai', 'au', 'ou',
    'R', 'Ru',
]);


// Buffer resolution

export interface ResolveResult {
    /** Sinhala text to commit (may be empty if nothing is committable yet) */
    toCommit: string;
    /** Remaining Roman buffer (ambiguous tail that could extend further) */
    remaining: string;
}

// Identify committable text vs pending buffer
export function resolveBuffer(buffer: string): ResolveResult {
    if (!buffer) return { toCommit: '', remaining: '' };

    // Tokenize
    interface Token {
        start: number;
        length: number;
        pattern: string;
        isPassthrough: boolean;
    }

    const tokens: Token[] = [];
    let pos = 0;
    let trailingPrefixStart = -1;
    while (pos < buffer.length) {
        const matchLen = longestMatchAt(buffer, pos);
        if (matchLen > 0) {
            tokens.push({
                start: pos,
                length: matchLen,
                pattern: buffer.slice(pos, pos + matchLen),
                isPassthrough: false,
            });
            pos += matchLen;
        } else if (isTriePrefix(buffer[pos])) {
            trailingPrefixStart = pos;
            break;
        } else {
            tokens.push({
                start: pos,
                length: 1,
                pattern: buffer[pos],
                isPassthrough: true,
            });
            pos += 1;
        }
    }

    if (tokens.length === 0) {
        return { toCommit: '', remaining: buffer };
    }

    if (trailingPrefixStart >= 0) {
        let cutIdx = tokens.length;
        while (cutIdx > 0) {
            const prev = tokens[cutIdx - 1];
            if (!prev.isPassthrough && CONSONANT_PATTERNS.has(prev.pattern)) {
                cutIdx--;
                continue;
            }
            break;
        }
        const commitEnd = cutIdx > 0 ? tokens[cutIdx - 1].start + tokens[cutIdx - 1].length : 0;
        if (commitEnd === 0) {
            return { toCommit: '', remaining: buffer };
        }
        return {
            toCommit: convertSinglishToSinhala(buffer.slice(0, commitEnd)),
            remaining: buffer.slice(commitEnd),
        };
    }

    // Find pending tokens

    const lastIdx = tokens.length - 1;
    const lastToken = tokens[lastIdx];
    const lastTokenEnd = lastToken.start + lastToken.length;



    if (tokens.length === 1) {
        if (lastToken.isPassthrough) {
            return { toCommit: lastToken.pattern, remaining: '' };
        }
        return { toCommit: '', remaining: buffer };
    }



    let pendingStart = lastIdx;

    if (lastTokenEnd === buffer.length && hasLongerPattern(lastToken.pattern)) {
        pendingStart = lastIdx;
    }

    while (pendingStart > 0) {
        const pendingToken = tokens[pendingStart];
        const prevToken = tokens[pendingStart - 1];

        if (!prevToken.isPassthrough && CONSONANT_PATTERNS.has(prevToken.pattern)) {
            if (!pendingToken.isPassthrough &&
                (VOWEL_PATTERNS.has(pendingToken.pattern) || hasLongerPattern(pendingToken.pattern))) {
                pendingStart--;
                continue;
            }
        }

        break;
    }


    const commitEnd = tokens[pendingStart].start;
    if (commitEnd === 0) {
        return { toCommit: '', remaining: buffer };
    }

    const head = buffer.slice(0, commitEnd);
    const tail = buffer.slice(commitEnd);

    return {
        toCommit: convertSinglishToSinhala(head),
        remaining: tail,
    };
}

// IME class

export interface IMEState {
    committed: string;
    pending: string;
}


export class SinglishIME {
    private buffer: string = '';

    getBuffer(): string {
        return this.buffer;
    }


    getSpeculativeDisplay(): string {
        if (!this.buffer) return '';
        return convertSinglishToSinhala(this.buffer);
    }

    processKey(key: string): ResolveResult {
        this.buffer += key;
        const result = resolveBuffer(this.buffer);
        this.buffer = result.remaining;
        return result;
    }

    backspace(): boolean {
        if (this.buffer.length > 0) {
            this.buffer = this.buffer.slice(0, -1);
            return true;
        }
        return false;
    }

    flush(): string {
        if (!this.buffer) return '';
        const converted = convertSinglishToSinhala(this.buffer);
        this.buffer = '';
        return converted;
    }

    hasPending(): boolean {
        return this.buffer.length > 0;
    }

    reset(): void {
        this.buffer = '';
    }
}
