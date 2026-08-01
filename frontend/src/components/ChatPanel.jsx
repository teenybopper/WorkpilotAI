import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, FileText, Mic, Brain } from 'lucide-react';
import { queryWorkspace } from '../lib/api';

export default function ChatPanel({ workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await queryWorkspace(workspaceId, query, 5);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        evidence: res.data.evidence,
        confidence: res.data.confidence,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card flex flex-col" style={{ height: '70vh' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-surface-950">Cross-Source Intelligence</h3>
          <p className="text-xs text-surface-600">Ask questions across all documents and meetings</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-10 h-10 text-surface-500 mb-4" />
            <h3 className="text-surface-800 font-medium mb-2">Ready to analyze</h3>
            <p className="text-sm text-surface-600 max-w-sm">
              Ask questions about your documents and meetings. The AI will search across all sources and provide evidence-backed answers.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'What decisions were made in the last meeting?',
                'Summarize the key contract terms',
                'Are there any conflicts between documents and meetings?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-surface-700 bg-surface-200/60 border border-white/5 hover:border-primary-500/30 hover:text-surface-900 transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl rounded-tr-md px-4 py-3'
                : 'space-y-3'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <>
                  <div className={`glass-card px-5 py-4 ${msg.error ? 'border-rose-500/30' : ''}`}>
                    <p className="text-sm text-surface-900 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.confidence !== undefined && !msg.error && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-surface-300 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                            style={{ width: `${msg.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-surface-600 whitespace-nowrap">
                          {Math.round(msg.confidence * 100)}% confidence
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Evidence cards */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Evidence ({msg.evidence.length} sources)
                      </p>
                      {msg.evidence.map((ev, j) => (
                        <div
                          key={j}
                          className="px-4 py-3 rounded-xl bg-surface-200/40 border border-white/5"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {ev.source_type === 'document'
                              ? <FileText className="w-3.5 h-3.5 text-blue-400" />
                              : <Mic className="w-3.5 h-3.5 text-purple-400" />
                            }
                            <span className="text-xs font-medium text-surface-800">{ev.filename}</span>
                            <span className="text-xs text-surface-500 ml-auto">
                              {Math.round(ev.relevance_score * 100)}% match
                            </span>
                          </div>
                          <p className="text-xs text-surface-600 line-clamp-2">{ev.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-surface-600">
            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
            <span>Searching across sources...</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your documents and meetings..."
            className="flex-1 px-4 py-3 rounded-xl bg-surface-200 border border-white/5 text-surface-950 placeholder-surface-600 focus:outline-none focus:border-primary-500 transition-colors text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow disabled:opacity-40 disabled:shadow-none cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
