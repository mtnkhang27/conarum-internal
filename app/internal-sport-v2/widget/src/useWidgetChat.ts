/**
 * useWidgetChat — Chat session management hook for the widget.
 * Simplified from the main app's useDocumentChat.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChatMessage, ChatSession,
    fetchChatSessions, sendChatMessage,
} from './chatApi';

interface UseWidgetChatReturn {
    messages: ChatMessage[];
    sessions: ChatSession[];
    activeSessionId: string | null;
    isLoading: boolean;
    isHistoryLoading: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<void>;
    switchSession: (sessionId: string) => void;
    startNewSession: () => void;
}

export function useWidgetChat(documentId: string): UseWidgetChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const allMessagesRef = useRef<Map<string, ChatMessage[]>>(new Map());
    const loadedRef = useRef(false);

    // Load sessions on mount
    useEffect(() => {
        if (!documentId || loadedRef.current) return;
        loadedRef.current = true;

        setIsHistoryLoading(true);
        fetchChatSessions(documentId)
            .then(({ sessions: s, allMessages }) => {
                allMessagesRef.current = allMessages;
                setSessions(s);
                if (s.length > 0) {
                    const latestId = s[0].sessionId;
                    setActiveSessionId(latestId);
                    setMessages(allMessages.get(latestId) || []);
                }
            })
            .catch(err => {
                console.warn('[widget-chat] Failed to load sessions:', err);
                // Not critical — widget can work without history
            })
            .finally(() => setIsHistoryLoading(false));
    }, [documentId]);

    const switchSession = useCallback((sessionId: string) => {
        setActiveSessionId(sessionId);
        setMessages(allMessagesRef.current.get(sessionId) || []);
        setError(null);
    }, []);

    const startNewSession = useCallback(() => {
        setActiveSessionId(null);
        setMessages([]);
        setError(null);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: text.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setError(null);

        try {
            const result = await sendChatMessage(documentId, text.trim(), activeSessionId);

            const assistantMsg: ChatMessage = {
                id: result.messageId || `ai-${Date.now()}`,
                role: 'assistant',
                content: result.answer,
                timestamp: new Date().toISOString(),
                thinking: result.thinking || undefined,
                agentTrace: result.agentTrace
                    ? (() => { try { return JSON.parse(result.agentTrace); } catch { return undefined; } })()
                    : undefined,
            };

            const newSessionId = result.sessionId;

            setMessages(prev => {
                const updated = [...prev, assistantMsg];
                allMessagesRef.current.set(newSessionId, updated);
                return updated;
            });

            // Update session list
            if (!activeSessionId || activeSessionId !== newSessionId) {
                setActiveSessionId(newSessionId);
                setSessions(prev => {
                    const exists = prev.find(s => s.sessionId === newSessionId);
                    if (exists) return prev;
                    return [{
                        sessionId: newSessionId,
                        firstMessage: text.trim(),
                        messageCount: 2,
                        lastActivity: new Date().toISOString(),
                    }, ...prev];
                });
            } else {
                setSessions(prev => prev.map(s =>
                    s.sessionId === newSessionId
                        ? { ...s, messageCount: s.messageCount + 2, lastActivity: new Date().toISOString() }
                        : s
                ));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
            // Remove optimistic user message
            setMessages(prev => prev.filter(m => m.id !== userMsg.id));
        } finally {
            setIsLoading(false);
        }
    }, [documentId, activeSessionId, isLoading]);

    return {
        messages, sessions, activeSessionId,
        isLoading, isHistoryLoading, error,
        sendMessage, switchSession, startNewSession,
    };
}
