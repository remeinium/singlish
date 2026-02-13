# Auto-Attach & UI Toggle Examples

## Example 1: Auto-attach Only

```typescript
import { createAutoAttach } from './singlish-js';

const autoAttach = createAutoAttach({
    enabled: true,
    exclude: '.no-singlish, [data-no-singlish]'
});

// Auto-attach is already running
// To stop: autoAttach.stop()
// To restart: autoAttach.start()
```

## Example 2: UI Toggle Only

```typescript
import { createUIToggle } from './singlish-js';

const toggle = createUIToggle({
    position: 'bottom-right',
    theme: 'auto',
    showLabel: true
});

toggle.mount();
```

## Example 3: Combined Setup

```typescript
import { createAutoAttach, createUIToggle } from './singlish-js';

const autoAttach = createAutoAttach({ enabled: false });

const toggle = createUIToggle({
    position: 'bottom-right',
    onToggle: (enabled) => {
        if (enabled) {
            autoAttach.start();
        } else {
            autoAttach.stop();
        }
    }
});

toggle.mount();

// Sync initial state
if (toggle.getEnabled()) {
    autoAttach.start();
}
```

## Example 4: Custom Container

```typescript
import { createUIToggle } from './singlish-js';

const toggle = createUIToggle({
    position: 'top-right',
    showLabel: false
});

const customContainer = document.getElementById('my-toolbar');
toggle.mount(customContainer);
```

## Example 5: Programmatic Control

```typescript
import { createAutoAttach, createUIToggle } from './singlish-js';

const autoAttach = createAutoAttach();
const toggle = createUIToggle();

toggle.mount();

// Programmatically enable/disable
document.getElementById('enable-btn')?.addEventListener('click', () => {
    toggle.setEnabled(true);
    autoAttach.start();
});

document.getElementById('disable-btn')?.addEventListener('click', () => {
    toggle.setEnabled(false);
    autoAttach.stop();
});
```

## Example 6: React Integration (Existing Hook Still Works)

```tsx
import { useSinglishConverter } from './singlish-js';

function ChatInput() {
    const { inputProps, enabled, toggle } = useSinglishConverter({
        enabled: true
    });
    
    return (
        <div>
            <button onClick={toggle}>
                {enabled ? '🇱🇰 සිං' : 'EN'}
            </button>
            <textarea {...inputProps} placeholder="Type in Singlish..." />
        </div>
    );
}
```

## Example 7: Selective Auto-attach

```typescript
import { createAutoAttach } from './singlish-js';

const autoAttach = createAutoAttach({
    selector: 'textarea.chat-input, input.search-box',
    onAttach: (element) => {
        console.log('Attached to:', element);
        element.setAttribute('data-singlish', 'true');
    }
});
```

## Example 8: Dynamic Theme

```typescript
import { createUIToggle } from './singlish-js';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

const toggle = createUIToggle({
    theme: prefersDark ? 'dark' : 'light',
    position: 'bottom-left'
});

toggle.mount();
```
