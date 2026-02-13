export interface ConversionOptions {
    /**
     * Whether to preserve non-Sinhala characters (numbers, punctuation, English)
     * @default true
     */
    preserveNonSinhala?: boolean;
    /**
     * Maximum pattern length to attempt matching
     * @default 4
     */
    maxPatternLength?: number;
}
export interface ConversionResult {
    /**
     * The converted Sinhala text
     */
    text: string;
    /**
     * Original Singlish input
     */
    original: string;
    /**
     * Number of characters converted
     */
    conversions: number;
}
export interface UseSinglishConverterOptions {
    /**
     * Initial enabled state
     * @default false
     */
    enabled?: boolean;
    /**
     * Callback fired when conversion occurs
     */
    onConvert?: (original: string, converted: string) => void;
    /**
     * Conversion options
     */
    options?: ConversionOptions;
    /**
     * Initial input value
     * @default ''
     */
    initialValue?: string;
    /**
     * Experimental mobile support.
     * Use with caution.
     */
    mobileSupport?: boolean;
}
export interface SinglishTextareaInputProps {
    ref: React.RefCallback<HTMLTextAreaElement>;
    value: string;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onBeforeInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}
export interface UseSinglishConverterReturn {
    /**
     * Spread this object onto a textarea to enable real-time IME behavior.
     */
    inputProps: SinglishTextareaInputProps;
    /**
     * Current textarea value.
     */
    value: string;
    /**
     * Set textarea value while resetting IME internal state.
     */
    setValue: (value: string) => void;
    /**
     * Current raw IME buffer (romanized form), useful for debug UI.
     */
    bufferDisplay: string;
    /**
     * Current enabled state
     */
    enabled: boolean;
    /**
     * Toggle enabled state
     */
    toggle: () => void;
    /**
     * Set enabled state explicitly.
     */
    setEnabled: (enabled: boolean) => void;
    /**
     * Focus the bound textarea.
     */
    focus: () => void;
    /**
     * Clear textarea and reset IME.
     */
    clear: () => void;
    /**
     * Convert whole current value using stateless converter.
     */
    convertAll: () => void;
    /**
     * Commit pending IME buffer into value and return the committed text.
     */
    flushPending: () => string;
}
