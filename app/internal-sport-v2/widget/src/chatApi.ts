/**
 * Widget API Client — Lightweight, fetch-based.
 * No axios dependency to minimize bundle size.
 */

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    thinking?: string;
    agentTrace?: AgentTraceStep[];
}

export interface AgentTraceStep {
    type: 'thinking' | 'tool_call' | 'tool_result' | 'answer';
    tool?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    content?: string;
    displayLabel?: string;
}

export interface ChatSession {
    sessionId: string;
    firstMessage: string;
    messageCount: number;
    lastActivity: string;
}

interface ChatMessageRecord {
    ID: string;
    sessionId: string;
    role: string;
    content: string;
    createdAt: string;
}

interface WidgetApiConfig {
    apiUrl: string;
    token: string;
}

let config: WidgetApiConfig = { apiUrl: '', token: '' };

export function configureApi(apiUrl: string, token: string) {
    config = { apiUrl: apiUrl.replace(/\/$/, ''), token };
}

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
    const resp = await fetch(`${config.apiUrl}${path}`, {
        ...options,
        headers: {
            'Authorization': config.token.startsWith('Bearer ') ? config.token : `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`API Error ${resp.status}: ${text}`);
    }
    return resp.json();
}

/**
 * Fetch all chat sessions and messages for a document.
 */
export async function fetchChatSessions(documentId: string): Promise<{
    sessions: ChatSession[];
    allMessages: Map<string, ChatMessage[]>;
}> {
    const filter = encodeURIComponent(`document_ID eq '${documentId}' and role ne 'system'`);
    const data = await apiFetch(
        `/chatWithDocument?$filter=${filter}&$orderby=${encodeURIComponent('createdAt asc')}&$top=500`
    ).catch(() => null);

    // If the OData endpoint isn't available, use the REST chat endpoint approach
    // For widget, we'll use the /chatWithDocument REST action directly
    // Sessions are managed client-side
    if (!data?.value) {
        return { sessions: [], allMessages: new Map() };
    }

    const records: ChatMessageRecord[] = data.value;

    // Sort: by createdAt ascending, then user before assistant
    const roleOrder: Record<string, number> = { user: 0, assistant: 1, system: 2 };
    records.sort((a, b) => {
        const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
    });

    // Group by session
    const sessionMap = new Map<string, ChatMessageRecord[]>();
    for (const r of records) {
        if (!sessionMap.has(r.sessionId)) sessionMap.set(r.sessionId, []);
        sessionMap.get(r.sessionId)!.push(r);
    }

    const sessions: ChatSession[] = [];
    const allMessages = new Map<string, ChatMessage[]>();

    for (const [sessionId, msgs] of sessionMap) {
        const firstUserMsg = msgs.find(m => m.role === 'user');
        sessions.push({
            sessionId,
            firstMessage: firstUserMsg?.content || 'New conversation',
            messageCount: msgs.length,
            lastActivity: msgs[msgs.length - 1]?.createdAt || '',
        });
        allMessages.set(sessionId, msgs.map(m => ({
            id: m.ID,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.createdAt,
        })));
    }

    sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    return { sessions, allMessages };
}

/**
 * Send a message via the REST chatWithDocument endpoint.
 */
export async function sendChatMessage(
    documentId: string,
    message: string,
    sessionId?: string | null,
): Promise<{ sessionId: string; answer: string; messageId: string; thinking?: string; agentTrace?: string }> {
    return apiFetch('/chatWithDocument', {
        method: 'POST',
        body: JSON.stringify({ documentId, sessionId: sessionId || null, message }),
    });
}
