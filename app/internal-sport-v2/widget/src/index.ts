/**
 * Internal Sport V2 Chat Widget — Web Component Entry Point
 *
 * This file:
 * 1. Defines a custom element <sport-chat> with Shadow DOM
 * 2. Injects styles into the shadow root
 * 3. Renders the React ChatWidget inside the shadow
 * 4. Exposes window.SportChat global API
 *
 * Usage:
 *   <script src="https://internalsportv2.../widget/sport-chat.js"></script>
 *   <script>
 *     SportChat.init({
 *       apiUrl: 'https://internalsportv2.../api/v1',
 *       token: 'Bearer ...',
 *       documentId: 'a1b2c3d4...',
 *     });
 *   </script>
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChatWidget, TriggerButton } from './ChatWidget';
import { configureApi } from './chatApi';
import cssText from './styles.css?inline';

// ── Types ──
interface SportChatConfig {
    apiUrl: string;
    token: string;
    documentId: string;
    theme?: {
        primaryColor?: string;
        primaryHoverColor?: string;
        fontFamily?: string;
    };
    position?: 'bottom-right' | 'bottom-left';
    defaultOpen?: boolean;
}

type EventCallback = (...args: any[]) => void;

// ── Widget State ──
let widgetRoot: Root | null = null;
let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentConfig: SportChatConfig | null = null;
let isOpen = false;
const eventListeners = new Map<string, Set<EventCallback>>();

// ── Render ──
function render() {
    if (!widgetRoot || !currentConfig) return;

    const position = currentConfig.position || 'bottom-right';

    widgetRoot.render(
        React.createElement(React.Fragment, null,
            // Trigger button (shown when closed)
            !isOpen && React.createElement(TriggerButton, {
                onClick: () => { open(); },
                position,
            }),
            // Chat window (shown when open)
            isOpen && React.createElement(ChatWidget, {
                documentId: currentConfig.documentId,
                onClose: () => { close(); },
                position,
                defaultOpen: currentConfig.defaultOpen,
            }),
        )
    );
}

// ── Public API ──
function init(config: SportChatConfig) {
    // Validate required fields
    if (!config.apiUrl) throw new Error('[SportChat] apiUrl is required');
    if (!config.token) throw new Error('[SportChat] token is required');
    if (!config.documentId) throw new Error('[SportChat] documentId is required');

    // Destroy previous instance if exists
    if (hostElement) {
        destroy();
    }

    currentConfig = config;

    // Configure the API client
    configureApi(config.apiUrl, config.token);

    // Create host element
    hostElement = document.createElement('div');
    hostElement.id = 'sport-chat-widget';
    document.body.appendChild(hostElement);

    // Create Shadow DOM for style isolation
    shadowRoot = hostElement.attachShadow({ mode: 'open' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;

    // Apply theme overrides
    if (config.theme) {
        let overrides = ':host {';
        if (config.theme.primaryColor) {
            overrides += `--internalsportv2-primary: ${config.theme.primaryColor};`;
        }
        if (config.theme.primaryHoverColor) {
            overrides += `--internalsportv2-primary-hover: ${config.theme.primaryHoverColor};`;
        }
        if (config.theme.fontFamily) {
            overrides += `--internalsportv2-font: ${config.theme.fontFamily};`;
        }
        overrides += '}';
        styleEl.textContent += '\n' + overrides;
    }
    shadowRoot.appendChild(styleEl);

    // Create React mount point
    const mountPoint = document.createElement('div');
    shadowRoot.appendChild(mountPoint);

    // Create React root
    widgetRoot = createRoot(mountPoint);

    // Auto-open if configured
    isOpen = config.defaultOpen || false;

    render();
    emit('init');
}

function open() {
    isOpen = true;
    render();
    emit('open');
}

function close() {
    isOpen = false;
    render();
    emit('close');
}

function destroy() {
    if (widgetRoot) {
        widgetRoot.unmount();
        widgetRoot = null;
    }
    if (hostElement) {
        hostElement.remove();
        hostElement = null;
    }
    shadowRoot = null;
    currentConfig = null;
    isOpen = false;
    eventListeners.clear();
    emit('destroy');
}

function on(event: string, callback: EventCallback) {
    if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(callback);
}

function off(event: string, callback: EventCallback) {
    eventListeners.get(event)?.delete(callback);
}

function emit(event: string, ...args: any[]) {
    eventListeners.get(event)?.forEach(cb => {
        try { cb(...args); } catch (e) { console.error('[SportChat] Event error:', e); }
    });
}

/**
 * Update the authentication token at runtime (e.g., after refresh).
 */
function setToken(token: string) {
    if (currentConfig) {
        currentConfig.token = token;
        configureApi(currentConfig.apiUrl, token);
    }
}

/**
 * Switch to a different document at runtime.
 */
function setDocumentId(documentId: string) {
    if (currentConfig) {
        currentConfig.documentId = documentId;
        // Re-render to reset chat for new document
        render();
    }
}

// ── Expose Global API ──
const SportChat = {
    init,
    open,
    close,
    destroy,
    on,
    off,
    setToken,
    setDocumentId,
};

// Assign to window
(window as any).SportChat = SportChat;

export default SportChat;
