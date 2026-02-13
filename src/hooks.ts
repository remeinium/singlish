

'use client';

import { useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { convertSinglishToSinhala } from './converter';
import { SinglishIME } from './ime-engine';
import type {
    UseSinglishConverterOptions,
    UseSinglishConverterReturn,
    SinglishTextareaInputProps,
} from './types';

function isSinglishKey(key: string): boolean {
    return key.length === 1 && /[a-zA-Z]/.test(key);
}

export function useSinglishConverter(
    hookOptions?: UseSinglishConverterOptions
): UseSinglishConverterReturn {
    const {
        enabled: initialEnabled = false,
        onConvert,
        options: conversionOptions,
        initialValue = '',
        mobileSupport = false,
    } = hookOptions || {};

    const [valueState, setValueState] = useState(initialValue);
    const [enabledState, setEnabledState] = useState(initialEnabled);
    const [bufferDisplay, setBufferDisplay] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const imeRef = useRef<SinglishIME>(new SinglishIME());
    const pendingDisplayLenRef = useRef<number>(0);
    const restoreCursorRef = useRef<number>(-1);
    const handledKeyRef = useRef<string | null>(null);
    const imeManagedValueRef = useRef<string | null>(null);

    const syncIMEDisplay = useCallback(() => {
        const rawBuf = imeRef.current.getBuffer();
        const speculative = imeRef.current.getSpeculativeDisplay();
        pendingDisplayLenRef.current = speculative.length;
        setBufferDisplay(rawBuf);
    }, []);

    const spliceAtBuffer = useCallback((
        currentValue: string,
        cursorPos: number,
        replacement: string,
    ): { newValue: string; newCursor: number } => {
        const displayLen = pendingDisplayLenRef.current;
        const bufStart = Math.max(0, cursorPos - displayLen);
        const before = currentValue.slice(0, bufStart);
        const after = currentValue.slice(cursorPos);
        return {
            newValue: before + replacement + after,
            newCursor: before.length + replacement.length,
        };
    }, []);

    const applyIMEUpdate = useCallback((newValue: string, newCursor: number) => {
        restoreCursorRef.current = newCursor;
        imeManagedValueRef.current = newValue;
        setValueState(newValue);
    }, []);

    const resetIMEState = useCallback(() => {
        imeRef.current.reset();
        pendingDisplayLenRef.current = 0;
        syncIMEDisplay();
        restoreCursorRef.current = -1;
        handledKeyRef.current = null;
        imeManagedValueRef.current = null;
    }, [syncIMEDisplay]);

    const flushPendingAtCursor = useCallback((cursor: number, currentValue: string) => {
        if (!imeRef.current.hasPending()) return { value: currentValue, cursor };
        const flushed = imeRef.current.flush();
        const s = spliceAtBuffer(currentValue, cursor, flushed);
        syncIMEDisplay();
        return { value: s.newValue, cursor: s.newCursor };
    }, [spliceAtBuffer, syncIMEDisplay]);

    const setValue = useCallback((nextValue: string) => {
        resetIMEState();
        setValueState(nextValue);
    }, [resetIMEState]);

    const focus = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    const clear = useCallback(() => {
        resetIMEState();
        setValueState('');
    }, [resetIMEState]);

    const convertAll = useCallback(() => {
        if (!valueState) return;
        const originalValue = valueState;
        const converted = convertSinglishToSinhala(originalValue, conversionOptions);
        resetIMEState();
        imeManagedValueRef.current = converted;
        setValueState(converted);
        if (onConvert && converted !== originalValue) {
            onConvert(originalValue, converted);
        }
    }, [valueState, conversionOptions, onConvert, resetIMEState]);

    const flushPending = useCallback((): string => {
        if (!imeRef.current.hasPending()) return valueState;
        const cursor = textareaRef.current?.selectionStart ?? valueState.length;
        const next = flushPendingAtCursor(cursor, valueState);
        applyIMEUpdate(next.value, next.cursor);
        return next.value;
    }, [valueState, flushPendingAtCursor, applyIMEUpdate]);

    const setEnabled = useCallback((nextEnabled: boolean) => {
        if (!nextEnabled && imeRef.current.hasPending()) {
            const cursor = textareaRef.current?.selectionStart ?? valueState.length;
            const flushed = imeRef.current.flush();
            const s = spliceAtBuffer(valueState, cursor, flushed);
            syncIMEDisplay();
            setValueState(s.newValue);
        }
        imeRef.current.reset();
        syncIMEDisplay();
        setEnabledState(nextEnabled);
    }, [valueState, spliceAtBuffer, syncIMEDisplay]);

    const toggle = useCallback(() => {
        setEnabled(!enabledState);
    }, [enabledState, setEnabled]);

    const bindRef = useCallback((el: HTMLTextAreaElement | null) => {
        textareaRef.current = el;
    }, []);

    const onBeforeInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
        textareaRef.current = e.currentTarget;
        if (!enabledState || !mobileSupport) return;

        const native = e.nativeEvent as InputEvent;
        if (native.inputType !== 'insertText') return;

        const data = native.data ?? '';
        if (data.length !== 1) return;

        if (handledKeyRef.current === data) {
            e.preventDefault();
            handledKeyRef.current = null;
            return;
        }
        handledKeyRef.current = null;

        const textarea = e.currentTarget;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const cursor = selStart;
        const hasSelection = selStart !== selEnd;

        if (isSinglishKey(data)) {
            e.preventDefault();

            let currentValue = valueState;
            let currentCursor = cursor;

            if (hasSelection) {
                if (imeRef.current.hasPending()) {
                    const flushed = imeRef.current.flush();
                    const s = spliceAtBuffer(currentValue, currentCursor, flushed);
                    currentValue = s.newValue;
                    pendingDisplayLenRef.current = 0;
                }
                const lo = Math.min(selStart, selEnd);
                const hi = Math.max(selStart, selEnd);
                currentValue = currentValue.slice(0, lo) + currentValue.slice(hi);
                currentCursor = lo;
                imeRef.current.reset();
                pendingDisplayLenRef.current = 0;
            }

            const result = imeRef.current.processKey(data);
            const s = spliceAtBuffer(
                currentValue,
                currentCursor,
                result.toCommit + imeRef.current.getSpeculativeDisplay(),
            );

            syncIMEDisplay();
            applyIMEUpdate(s.newValue, s.newCursor);
            return;
        }

        if (imeRef.current.hasPending()) {
            e.preventDefault();
            const flushed = imeRef.current.flush();
            const s = spliceAtBuffer(valueState, cursor, flushed + data);
            syncIMEDisplay();
            applyIMEUpdate(s.newValue, s.newCursor);
        }
    }, [enabledState, mobileSupport, valueState, spliceAtBuffer, syncIMEDisplay, applyIMEUpdate]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        textareaRef.current = e.currentTarget;
        if (!enabledState) return;

        const textarea = e.currentTarget;
        const selStart = textarea.selectionStart;
        const selEnd = textarea.selectionEnd;
        const cursor = selStart;
        const hasSelection = selStart !== selEnd;

        if (isSinglishKey(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            handledKeyRef.current = e.key;

            let currentValue = valueState;
            let currentCursor = cursor;

            if (hasSelection) {
                if (imeRef.current.hasPending()) {
                    const flushed = imeRef.current.flush();
                    const s = spliceAtBuffer(currentValue, currentCursor, flushed);
                    currentValue = s.newValue;
                    pendingDisplayLenRef.current = 0;
                }
                const lo = Math.min(selStart, selEnd);
                const hi = Math.max(selStart, selEnd);
                currentValue = currentValue.slice(0, lo) + currentValue.slice(hi);
                currentCursor = lo;
                imeRef.current.reset();
                pendingDisplayLenRef.current = 0;
            }

            const result = imeRef.current.processKey(e.key);
            const s = spliceAtBuffer(
                currentValue,
                currentCursor,
                result.toCommit + imeRef.current.getSpeculativeDisplay(),
            );
            syncIMEDisplay();
            applyIMEUpdate(s.newValue, s.newCursor);
            return;
        }

        if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !hasSelection && imeRef.current.hasPending()) {
            e.preventDefault();
            imeRef.current.backspace();
            const newPending = imeRef.current.getSpeculativeDisplay();
            const s = spliceAtBuffer(valueState, cursor, newPending);
            syncIMEDisplay();
            applyIMEUpdate(s.newValue, s.newCursor);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            if (imeRef.current.hasPending()) {
                const flushed = imeRef.current.flush();
                const s = spliceAtBuffer(valueState, cursor, flushed);
                syncIMEDisplay();
                restoreCursorRef.current = -1;
                setValueState(s.newValue);
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
            imeRef.current.reset();
            pendingDisplayLenRef.current = 0;
            syncIMEDisplay();
            restoreCursorRef.current = -1;
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const originalValue = valueState;
            imeRef.current.reset();
            syncIMEDisplay();
            if (originalValue) {
                const converted = convertSinglishToSinhala(originalValue, conversionOptions);
                applyIMEUpdate(converted, converted.length);
                if (onConvert && converted !== originalValue) {
                    onConvert(originalValue, converted);
                }
            }
            return;
        }

        if (e.key.length === 1 && !isSinglishKey(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (imeRef.current.hasPending()) {
                e.preventDefault();
                handledKeyRef.current = e.key;
                const flushed = imeRef.current.flush();
                const s = spliceAtBuffer(valueState, cursor, flushed + e.key);
                syncIMEDisplay();
                applyIMEUpdate(s.newValue, s.newCursor);
                return;
            }
            return;
        }

        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            if (imeRef.current.hasPending()) {
                e.preventDefault();
                const flushed = imeRef.current.flush();
                const s = spliceAtBuffer(valueState, cursor, flushed + '\n');
                syncIMEDisplay();
                applyIMEUpdate(s.newValue, s.newCursor);
                return;
            }
            return;
        }

        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
            if (imeRef.current.hasPending()) {
                const flushed = imeRef.current.flush();
                const s = spliceAtBuffer(valueState, cursor, flushed);
                syncIMEDisplay();
                applyIMEUpdate(s.newValue, s.newCursor);
            }
            return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (imeRef.current.hasPending()) {
                e.preventDefault();
                const flushed = imeRef.current.flush();
                const s = spliceAtBuffer(valueState, cursor, flushed);
                syncIMEDisplay();

                let newVal = s.newValue;
                let newCur = s.newCursor;

                if (hasSelection) {
                    const lo = Math.min(selStart, selEnd);
                    const hi = Math.max(selStart, selEnd);
                    newVal = newVal.slice(0, lo) + newVal.slice(hi);
                    newCur = lo;
                } else if (e.key === 'Backspace' && newCur > 0) {
                    newVal = newVal.slice(0, newCur - 1) + newVal.slice(newCur);
                    newCur = newCur - 1;
                } else if (e.key === 'Delete' && newCur < newVal.length) {
                    newVal = newVal.slice(0, newCur) + newVal.slice(newCur + 1);
                }

                applyIMEUpdate(newVal, newCur);
            }
            return;
        }
    }, [
        enabledState,
        valueState,
        conversionOptions,
        onConvert,
        spliceAtBuffer,
        syncIMEDisplay,
        applyIMEUpdate,
    ]);

    const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        textareaRef.current = e.currentTarget;

        if (!enabledState) {
            setValueState(e.target.value);
            return;
        }

        if (imeManagedValueRef.current !== null && e.target.value === imeManagedValueRef.current) {
            imeManagedValueRef.current = null;
            return;
        }
        imeManagedValueRef.current = null;

        imeRef.current.reset();
        pendingDisplayLenRef.current = 0;
        syncIMEDisplay();
        restoreCursorRef.current = -1;
        setValueState(e.target.value);
    }, [enabledState, syncIMEDisplay]);

    const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        textareaRef.current = e.currentTarget;
        if (!enabledState) return;

        if (imeRef.current.hasPending()) {
            const cursor = textareaRef.current?.selectionStart ?? valueState.length;
            const flushed = imeRef.current.flush();
            const s = spliceAtBuffer(valueState, cursor, flushed);
            syncIMEDisplay();
            setValueState(s.newValue);
        }
    }, [enabledState, valueState, spliceAtBuffer, syncIMEDisplay]);

    const onBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
        textareaRef.current = e.currentTarget;
        if (!enabledState) return;

        if (imeRef.current.hasPending()) {
            const cursor = textareaRef.current?.selectionStart ?? valueState.length;
            const next = flushPendingAtCursor(cursor, valueState);
            applyIMEUpdate(next.value, next.cursor);
        }
    }, [enabledState, valueState, flushPendingAtCursor, applyIMEUpdate]);

    useLayoutEffect(() => {
        const pos = restoreCursorRef.current;
        if (pos >= 0 && textareaRef.current) {
            textareaRef.current.selectionStart = pos;
            textareaRef.current.selectionEnd = pos;
        }
        restoreCursorRef.current = -1;
    }, [valueState]);

    const inputProps = useMemo<SinglishTextareaInputProps>(() => ({
        ref: bindRef,
        value: valueState,
        onKeyDown,
        onBeforeInput,
        onChange,
        onPaste,
        onBlur,
    }), [bindRef, valueState, onKeyDown, onBeforeInput, onChange, onPaste, onBlur]);

    return useMemo(
        () => ({
            inputProps,
            value: valueState,
            setValue,
            bufferDisplay,
            enabled: enabledState,
            toggle,
            setEnabled,
            focus,
            clear,
            convertAll,
            flushPending,
        }),
        [
            inputProps,
            valueState,
            setValue,
            bufferDisplay,
            enabledState,
            toggle,
            setEnabled,
            focus,
            clear,
            convertAll,
            flushPending,
        ],
    );
}
