import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Iframe-safe FLP sync using postMessage API.
 * 
 * When running in an iframe, we can't directly access parent.location due to
 * cross-origin restrictions. Instead, we use postMessage to communicate with
 * the parent window.
 * 
 * Messages sent to parent:
 * - { type: 'ROUTE_CHANGE', route: string } - notify parent of route changes
 * 
 * Messages received from parent:
 * - { type: 'INITIAL_STATE', hash: string, search: string } - initial FLP state
 */

// Global store for initial FLP state received from parent
let initialFLPState: { hash: string; search: string } | null = null;
let stateReceived = false;

/**
 * Sync React Router navigation with parent FLP URL using postMessage.
 */
export function useFLPSyncDirect() {
    const location = useLocation();
    const isInitialRenderRef = useRef(true);

    useEffect(() => {
        // Check if we're in an iframe
        const isInIframe = window.parent !== window;

        if (!isInIframe) {
            console.log("[FLP-SYNC] Standalone mode - skipping");
            return;
        }

        // Build app route from pathname
        const appRoute = location.pathname.replace(/^\//, "");

        console.log("[FLP-SYNC] Syncing route to parent:", appRoute, "| Initial render:", isInitialRenderRef.current);

        // Check if we have a deep link in the initial state
        const hasDeepLinkInParent = initialFLPState?.hash?.includes("&/") || false;

        // Skip sync on initial render if we're at root and parent has a deep link
        if (isInitialRenderRef.current && appRoute === "" && hasDeepLinkInParent) {
            console.log("[FLP-SYNC] Skipping initial sync - waiting for deep link navigation");
            isInitialRenderRef.current = false;
            return;
        }

        isInitialRenderRef.current = false;

        // Send route change to parent via postMessage
        try {
            window.parent.postMessage({
                type: 'ROUTE_CHANGE',
                route: appRoute
            }, '*');
            console.log("[FLP-SYNC] Sent route change to parent:", appRoute);
        } catch (e) {
            console.error("[FLP-SYNC] Failed to send message to parent:", e);
        }
    }, [location.pathname]);
}

/**
 * Get the initial route from parent FLP hash.
 * This uses the cached initialFLPState received via postMessage.
 */
export function getInitialFLPRoute(): string {
    let initialRoute = "/";

    if (window.parent === window) {
        console.log("[FLP-INIT] Standalone mode - using default route");
        return initialRoute;
    }

    // First try to get from cached state (postMessage)
    if (initialFLPState && initialFLPState.hash) {
        const parentHash = initialFLPState.hash;
        console.log("[FLP-INIT] Parent hash (from postMessage):", parentHash);

        const parts = parentHash.split("&/");
        if (parts.length > 1) {
            const routePart = parts[parts.length - 1];
            initialRoute = "/" + routePart;
            console.log("[FLP-INIT] Found initial route:", initialRoute);
            return initialRoute;
        }
    }

    // Fallback: try direct access (works in same-origin scenarios or local dev)
    try {
        const parentHash = window.parent.location.hash;
        console.log("[FLP-INIT] Parent hash (direct access):", parentHash);

        const parts = parentHash.split("&/");
        if (parts.length > 1) {
            const routePart = parts[parts.length - 1];
            initialRoute = "/" + routePart;
            console.log("[FLP-INIT] Found initial route:", initialRoute);
        } else {
            console.log("[FLP-INIT] No inner route found, using default /");
        }
    } catch (e) {
        console.log("[FLP-INIT] Cannot access parent directly (expected in iframe)");
    }

    return initialRoute;
}

/**
 * Get URL parameters from initial FLP state.
 * Returns an object with locale and theme extracted from the parent URL.
 */
export function getInitialFLPParams(): { locale: string | null; theme: string | null } {
    const result = { locale: null as string | null, theme: null as string | null };

    if (window.parent === window) {
        console.log("[FLP-PARAMS] Standalone mode");
        return result;
    }

    // Try from cached state (postMessage)
    if (initialFLPState && initialFLPState.search) {
        const params = new URLSearchParams(initialFLPState.search);
        result.locale = params.get('sap-locale');
        result.theme = params.get('sap-theme');
        console.log("[FLP-PARAMS] From postMessage - locale:", result.locale, "theme:", result.theme);
        return result;
    }

    // Fallback: try direct access
    try {
        const params = new URLSearchParams(window.parent.location.search);
        result.locale = params.get('sap-locale');
        result.theme = params.get('sap-theme');
        console.log("[FLP-PARAMS] From direct access - locale:", result.locale, "theme:", result.theme);
    } catch (e) {
        console.log("[FLP-PARAMS] Cannot access parent directly (expected in iframe)");
    }

    return result;
}

/**
 * Initialize postMessage listener to receive initial state from parent.
 * This should be called once at app startup.
 */
export function initFLPMessageListener() {
    if (stateReceived) {
        return; // Already initialized
    }

    console.log("[FLP-MSG] Initializing message listener");

    // Listen for messages from parent
    const handleMessage = (event: MessageEvent) => {
        // In production, you should validate event.origin for security
        // For now, we accept messages from any origin

        if (event.data && event.data.type === 'INITIAL_STATE') {
            console.log("[FLP-MSG] Received initial state from parent:", event.data);
            initialFLPState = {
                hash: event.data.hash || '',
                search: event.data.search || ''
            };
            stateReceived = true;
        }
    };

    window.addEventListener('message', handleMessage);

    // Request initial state from parent
    if (window.parent !== window) {
        console.log("[FLP-MSG] Requesting initial state from parent");
        try {
            window.parent.postMessage({ type: 'REQUEST_INITIAL_STATE' }, '*');
        } catch (e) {
            console.error("[FLP-MSG] Failed to request initial state:", e);
        }
    }
}
