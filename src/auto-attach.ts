/**
 * Auto-attach Singlish conversion to input elements.
 * Provides opt-in DOM integration with cleanup support.
 */

import { SinglishIME } from './ime-engine';
import type { AutoAttachOptions, AutoAttachInstance } from './types';

const DEFAULT_SELECTOR = 'input[type="text"], input[type="search"], textarea';

export function createAutoAttach(options: AutoAttachOptions = {}): AutoAttachInstance {
    const {
        enabled = true,
        selector = DEFAULT_SELECTOR,
        exclude,
        onAttach,
    } = options;

    let isRunning = false;
    let observer: MutationObserver | null = null;
    const attachedElements = new WeakSet<HTMLElement>();
    const imeInstances = new WeakMap<HTMLElement, SinglishIME>();

    function shouldAttach(element: HTMLElement): boolean {
        if (attachedElements.has(element)) return false;
        if (exclude && element.matches(exclude)) return false;
        return true;
    }

    function attachToElement(element: HTMLElement): void {
        if (!shouldAttach(element)) return;

        const ime = new SinglishIME();
        imeInstances.set(element, ime);
        attachedElements.add(element);

        const isTextarea = element instanceof HTMLTextAreaElement;
        const isInput = element instanceof HTMLInputElement;

        if (!isTextarea && !isInput) return;

        function handleKeyDown(e: KeyboardEvent): void {
            if (e.key === 'Backspace') {
                const didHandle = ime.backspace();
                if (didHandle) {
                    e.preventDefault();
                    updateDisplay();
                }
                return;
            }

            if (e.key === 'Enter' || e.key === 'Escape') {
                const committed = ime.flush();
                if (committed) {
                    insertText(committed);
                }
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                const result = ime.processKey(e.key);
                if (result.toCommit) {
                    insertText(result.toCommit);
                }
                updateDisplay();
            }
        }

        function handleBlur(): void {
            const committed = ime.flush();
            if (committed) {
                insertText(committed);
            }
        }

        function insertText(text: string): void {
            const target = element as HTMLTextAreaElement | HTMLInputElement;
            const start = target.selectionStart ?? target.value.length;
            const end = target.selectionEnd ?? target.value.length;
            const before = target.value.substring(0, start);
            const after = target.value.substring(end);

            target.value = before + text + after;
            const newPos = start + text.length;
            target.setSelectionRange(newPos, newPos);

            target.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function updateDisplay(): void {
            // Visual feedback could be added here
        }

        element.addEventListener('keydown', handleKeyDown as EventListener);
        element.addEventListener('blur', handleBlur);

        onAttach?.(element);
    }

    function attachToExisting(): void {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        elements.forEach(attachToElement);
    }

    function observeDOM(): void {
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    const element = node as HTMLElement;

                    if (element.matches(selector)) {
                        attachToElement(element);
                    }

                    const children = element.querySelectorAll<HTMLElement>(selector);
                    children.forEach(attachToElement);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function start(): void {
        if (isRunning) return;
        isRunning = true;
        attachToExisting();
        observeDOM();
    }

    function stop(): void {
        if (!isRunning) return;
        isRunning = false;
        observer?.disconnect();
        observer = null;
    }

    function toggle(): void {
        if (isRunning) stop();
        else start();
    }

    if (enabled) {
        start();
    }

    return {
        start,
        stop,
        isRunning: () => isRunning,
        toggle,
    };
}
