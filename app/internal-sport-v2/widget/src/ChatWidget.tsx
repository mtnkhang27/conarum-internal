/**
 * ChatWidget.tsx — Standalone React component for the embeddable widget.
 * Renders the chat UI with session sidebar, messages, and input area.
 * Supports markdown in responses via dangerouslySetInnerHTML with simple parsing.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWidgetChat } from './useWidgetChat';

// ── SVG Icons (inlined to avoid external deps) ──
const IconChat = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
);
const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);
const IconSend = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);
const IconPlus = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
);
const IconSidebar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
);
const IconMaximize = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
);
const IconMinimize = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
        <line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
);
const IconSparkle = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/>
    </svg>
);

// ── Simple markdown to HTML ──
function renderMarkdown(text: string): string {
    return text
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
            const code = match.slice(3, -3).replace(/^\w+\n/, '');
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        })
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Tables (basic)
        .replace(/\|(.+)\|/g, (match) => {
            const cells = match.split('|').filter(c => c.trim());
            if (cells.every(c => /^[\s-:]+$/.test(c))) return '';
            const tag = 'td';
            return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
        })
        .replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Quick action chips ──
const QUICK_ACTIONS = [
    { label: '📋 Summarize', prompt: 'Provide a comprehensive summary of this document' },
    { label: '⚠️ Risks', prompt: 'Identify all risks, hidden conditions, and unfavorable clauses' },
    { label: '📑 Key Clauses', prompt: 'List the most important clauses and their implications' },
    { label: '📅 Deadlines', prompt: 'List all deadlines and time-sensitive obligations' },
];

// ── Props ──
export interface ChatWidgetProps {
    documentId: string;
    onClose: () => void;
    position: 'bottom-right' | 'bottom-left';
    defaultOpen?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ documentId, onClose, position }) => {
    const {
        messages, sessions, activeSessionId,
        isLoading, isHistoryLoading, error,
        sendMessage, switchSession, startNewSession,
    } = useWidgetChat(documentId);

    const [input, setInput] = useState('');
    const [showSidebar, setShowSidebar] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSend = useCallback(() => {
        if (!input.trim() || isLoading) return;
        sendMessage(input.trim());
        setInput('');
    }, [input, isLoading, sendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleChip = useCallback((prompt: string) => {
        sendMessage(prompt);
    }, [sendMessage]);

    const windowClasses = [
        'clair2-window',
        position === 'bottom-left' ? 'clair2-window-left' : '',
        isFullscreen ? 'clair2-window-fullscreen' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={windowClasses}>
            {/* Sidebar */}
            {(showSidebar || isFullscreen) && (
                <div className="clair2-sidebar">
                    <div className="clair2-sidebar-header">
                        <button className="clair2-new-btn" onClick={() => { startNewSession(); if (!isFullscreen) setShowSidebar(false); }}>
                            <IconPlus /> New Conversation
                        </button>
                    </div>
                    <div className="clair2-session-list">
                        {isHistoryLoading && (
                            <div className="clair2-history-loading">Loading history...</div>
                        )}
                        {sessions.map(s => (
                            <div
                                key={s.sessionId}
                                className={`clair2-session-item ${s.sessionId === activeSessionId ? 'active' : ''}`}
                                onClick={() => { switchSession(s.sessionId); if (!isFullscreen) setShowSidebar(false); }}
                            >
                                <div className="clair2-session-title">{s.firstMessage}</div>
                                <div className="clair2-session-meta">
                                    {s.messageCount} messages · {formatTimeAgo(s.lastActivity)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Area */}
            <div className="clair2-main">
                {/* Header */}
                <div className="clair2-header">
                    <button
                        className="clair2-icon-btn"
                        onClick={() => setShowSidebar(v => !v)}
                        title="Toggle history"
                    >
                        <IconSidebar />
                    </button>
                    <div className="clair2-header-title">
                        <h3>Document Analyst</h3>
                        <p>AI-powered document consulting</p>
                    </div>
                    <button
                        className="clair2-icon-btn"
                        onClick={() => setIsFullscreen(v => !v)}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <IconMinimize /> : <IconMaximize />}
                    </button>
                    <button className="clair2-icon-btn" onClick={onClose} title="Close">
                        <IconX />
                    </button>
                </div>

                {/* Quick actions (show when no messages) */}
                {messages.length === 0 && !isLoading && (
                    <>
                        <div className="clair2-empty">
                            <IconSparkle />
                            <p>Ask me anything about this document — risks, clauses, deadlines, or get a full summary.</p>
                        </div>
                        <div className="clair2-quick-actions">
                            {QUICK_ACTIONS.map(a => (
                                <button key={a.label} className="clair2-chip" onClick={() => handleChip(a.prompt)}>
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Messages */}
                {messages.length > 0 && (
                    <div className="clair2-messages">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`clair2-msg clair2-msg-${msg.role}`}
                            >
                                {msg.role === 'assistant' ? (
                                    <div>
                                        {/* Thinking section */}
                                        {msg.thinking && (
                                            <details className="clair2-thinking">
                                                <summary>🧠 Reasoning</summary>
                                                <pre>{msg.thinking}</pre>
                                            </details>
                                        )}
                                        {/* Agent trace */}
                                        {msg.agentTrace && msg.agentTrace.filter(s => s.type === 'tool_call').length > 0 && (
                                            <div className="clair2-trace">
                                                {msg.agentTrace.filter(s => s.type === 'tool_call').map((step, i) => {
                                                    const result = msg.agentTrace?.find(
                                                        s => s.type === 'tool_result' && s.tool === step.tool
                                                    );
                                                    return (
                                                        <details key={i} className="clair2-trace-step">
                                                            <summary>
                                                                🔧 {result?.displayLabel || step.displayLabel || step.tool}
                                                            </summary>
                                                            {step.args && (
                                                                <div className="clair2-trace-detail">
                                                                    <strong>Input:</strong>
                                                                    <pre>{JSON.stringify(step.args, null, 2)}</pre>
                                                                </div>
                                                            )}
                                                            {result?.result && (
                                                                <div className="clair2-trace-detail">
                                                                    <strong>Result:</strong>
                                                                    <pre>{JSON.stringify(result.result, null, 2)}</pre>
                                                                </div>
                                                            )}
                                                        </details>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {/* Main answer */}
                                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="clair2-loading">
                                <div className="clair2-loading-dot" />
                                <div className="clair2-loading-dot" />
                                <div className="clair2-loading-dot" />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* Error */}
                {error && <div className="clair2-error">{error}</div>}

                {/* Input */}
                <div className="clair2-input-area">
                    <textarea
                        ref={inputRef}
                        className="clair2-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about this document..."
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="clair2-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <IconSend />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Helpers ──
function formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * TriggerButton — Floating button that opens the chat.
 */
export const TriggerButton: React.FC<{
    onClick: () => void;
    position: 'bottom-right' | 'bottom-left';
}> = ({ onClick, position }) => (
    <button
        className={`clair2-trigger ${position === 'bottom-left' ? 'clair2-trigger-left' : ''}`}
        onClick={onClick}
        aria-label="Open Document Chat"
    >
        <IconChat />
    </button>
);
