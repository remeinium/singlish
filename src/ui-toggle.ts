/**
 * UI toggle button for Singlish conversion.
 * Provides a floating button with state management.
 */

import type { UIToggleOptions, UIToggleInstance } from './types';

const STORAGE_KEY = 'singlish-enabled';

export function createUIToggle(options: UIToggleOptions = {}): UIToggleInstance {
    const {
        position = 'bottom-right',
        theme = 'auto',
        showLabel = true,
        onToggle,
    } = options;

    let enabled = loadState();
    let button: HTMLElement | null = null;
    let container: HTMLElement | null = null;

    function loadState(): boolean {
        if (typeof localStorage === 'undefined') return true;
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === null ? true : stored === 'true';
    }

    function saveState(value: boolean): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, String(value));
    }

    function createButton(): HTMLElement {
        const btn = document.createElement('button');
        btn.className = `singlish-toggle singlish-toggle--${position}`;
        btn.setAttribute('aria-label', 'Toggle Singlish input');
        btn.setAttribute('type', 'button');

        updateButtonContent(btn);

        btn.addEventListener('click', handleToggle);
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
            }
        });

        return btn;
    }

    function updateButtonContent(btn: HTMLElement): void {
        const icon = enabled ? '🇱🇰' : 'EN';
        const label = enabled ? 'සිං' : 'English';

        if (showLabel) {
            btn.innerHTML = `<span class="singlish-toggle__icon">${icon}</span><span class="singlish-toggle__label">${label}</span>`;
        } else {
            btn.innerHTML = `<span class="singlish-toggle__icon">${icon}</span>`;
        }

        btn.classList.toggle('singlish-toggle--enabled', enabled);
        btn.setAttribute('aria-pressed', String(enabled));
    }

    function handleToggle(): void {
        enabled = !enabled;
        saveState(enabled);
        if (button) updateButtonContent(button);
        onToggle?.(enabled);
    }

    function mount(targetContainer?: HTMLElement): void {
        if (button) return;

        container = targetContainer || document.body;
        button = createButton();
        container.appendChild(button);

        loadStyles();
    }

    function unmount(): void {
        if (!button) return;
        button.remove();
        button = null;
        container = null;
    }

    function setEnabled(value: boolean): void {
        if (enabled === value) return;
        enabled = value;
        saveState(value);
        if (button) updateButtonContent(button);
    }

    function getEnabled(): boolean {
        return enabled;
    }

    function loadStyles(): void {
        if (document.getElementById('singlish-toggle-styles')) return;

        const style = document.createElement('style');
        style.id = 'singlish-toggle-styles';
        style.textContent = getStyles(theme);
        document.head.appendChild(style);
    }

    return {
        mount,
        unmount,
        setEnabled,
        getEnabled,
    };
}

function getStyles(theme: 'light' | 'dark' | 'auto'): string {
    const lightBg = 'rgba(255, 255, 255, 0.9)';
    const darkBg = 'rgba(30, 30, 30, 0.9)';
    const lightText = '#1a1a1a';
    const darkText = '#ffffff';

    const bg = theme === 'dark' ? darkBg : theme === 'light' ? lightBg : lightBg;
    const text = theme === 'dark' ? darkText : theme === 'light' ? lightText : lightText;

    return `
.singlish-toggle {
    position: fixed;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: ${bg};
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    color: ${text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
}

.singlish-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.singlish-toggle:active {
    transform: translateY(0);
}

.singlish-toggle:focus {
    outline: 2px solid #4A90E2;
    outline-offset: 2px;
}

.singlish-toggle--top-right {
    top: 20px;
    right: 20px;
}

.singlish-toggle--top-left {
    top: 20px;
    left: 20px;
}

.singlish-toggle--bottom-right {
    bottom: 20px;
    right: 20px;
}

.singlish-toggle--bottom-left {
    bottom: 20px;
    left: 20px;
}

.singlish-toggle__icon {
    font-size: 18px;
    line-height: 1;
}

.singlish-toggle__label {
    font-size: 13px;
    font-weight: 600;
}

.singlish-toggle--enabled {
    background: linear-gradient(135deg, rgba(74, 144, 226, 0.9), rgba(106, 90, 205, 0.9));
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
}

@media (prefers-color-scheme: dark) {
    .singlish-toggle {
        background: ${theme === 'auto' ? darkBg : bg};
        color: ${theme === 'auto' ? darkText : text};
    }
}

@media (max-width: 768px) {
    .singlish-toggle {
        padding: 8px 12px;
        font-size: 13px;
    }
    
    .singlish-toggle__icon {
        font-size: 16px;
    }
}
`;
}
