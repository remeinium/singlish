# @siyabasa/singlish

A deterministic, high-performance transliteration engine for Singlish (Romanized Sinhala) with phonetic precision and zero-latency IME support. Built for the modern web by **Remeinium Siyabasa Labs**.

[![NPM Version](https://img.shields.io/npm/v/@siyabasa/singlish.svg)](https://www.npmjs.com/package/@siyabasa/singlish)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@siyabasa/singlish)](https://bundlephobia.com/package/@siyabasa/singlish)
[![License](https://img.shields.io/npm/l/@siyabasa/singlish.svg)](https://github.com/remeinium/singlish/blob/main/LICENSE)

## Design Philosophy

The Singlish Input Method Editor (IME) landscape has long been fragmented by ad-hoc regex replacements and non-standard transliteration schemes. **@siyabasa/singlish** introduces a rigourous, computer-science first approach to Sinhala transliteration:

- **Deterministic Phoneme Tokenization**: Unlike simple string replacement, our engine tokenizes Roman input into phonetic units before rendering, ensuring 100% accuracy for complex conjuncts (*yansaya*, *rakaransaya*) and vowel modifiers.
- **Zero-Latency Architecture**: Optimized for the critical rendering path. The core conversion engine operates in O(n) time complexity using a prefix-trie based lookahead parser.
- **Universal Runtime**: Isomorphic design that runs seamlessly on the Edge, Node.js, and in the Browser.

## Architecture

The engine uses a two-stage compilation process:
1. **Lexical Analysis**: Input text is scanned and tokenized into phonemes using a greedy matching algorithm against a compiled trie of 400+ phoneme patterns.
2. **Contextual Rendering**: A state-machine renderer processes the token stream to handle inherent vowels, *hal-kirima*, and context-dependent glyph shaping (e.g., standard *ra* vs *rakaransaya* forms).

## Installation

```bash
npm install @siyabasa/singlish
# or
yarn add @siyabasa/singlish
# or
pnpm add @siyabasa/singlish
```

## Quick Start

### Core Transliteration

The core API is stateless and synchronous, designed for high-throughput server-side rendering or bulk text processing.

```typescript
import { convertSinglishToSinhala } from '@siyabasa/singlish';

const output = convertSinglishToSinhala('aayuboowan'); 
// Output: "ආයුබෝවන්"
```

### React IME Hook

For building rich text editors or chat interfaces, use the `useSinglishConverter` hook. It manages cursor position, input history, and IME state automatically.

```tsx
import { useSinglishConverter } from '@siyabasa/singlish';

export function Editor() {
  const { inputProps, enabled, toggle } = useSinglishConverter({ enabled: true });
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Input Method</span>
        <button 
          onClick={toggle}
          className="px-3 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {enabled ? '🇱🇰 Siyabasa IME' : '🇺🇸 English'}
        </button>
      </div>
      <textarea 
        {...inputProps} 
        className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Type in Singlish (e.g., 'kohomada')..."
      />
    </div>
  );
}
```

### Auto-Attach (Zero Config)

For legacy applications or rapid prototyping, the Auto-Attach module uses a `MutationObserver` to automatically hydrate all input fields in the DOM with Singlish capabilities.

```typescript
import { createAutoAttach, createUIToggle } from '@siyabasa/singlish';

// Automatically attaches to all input[type="text"] and textarea elements
const autoAttach = createAutoAttach({
  exclude: '[data-no-ime]' // Optional exclusion selector
});

// Mounts a floating toggle widget
const toggle = createUIToggle({
  position: 'bottom-right',
  theme: 'auto'
});

toggle.mount();
```

## API Reference

### `convertSinglishToSinhala(text: string, options?: ConversionOptions): string`
Pure function to transpile Singlish text to Sinhala Unicode.

### `convertWithMetadata(text: string): ConversionResult`
Extended version of the core converter that provides tokenization details and conversion metrics.

### `useSinglishConverter(options?: HookOptions)`
React hook that returns spreadable input props (`value`, `onChange`, `onKeyDown`, etc.) for seamless IME integration.

## License

ROSL 1.0 © [Remeinium Siyabasa Labs](https://labs.remeinium.com)

---

<div align="center">
  <p>Built with ❤️ for the Sri Lankan Developer Community</p>
</div>
