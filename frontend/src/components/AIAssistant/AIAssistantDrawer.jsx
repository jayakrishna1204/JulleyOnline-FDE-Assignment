import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

export const AIAssistantDrawer = ({ isOpen, onClose, activeBoard, tenantName }) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **JulleyOnline AI Kanban Assistant** powered by an Agentic Python FastAPI service.\n\nI can analyze work items, identify overdue bottlenecks, inspect recent audit trails, and calculate completion metrics—all strictly isolated to the **${tenantName}** branch.`,
      toolsUsed: ['init_agent'],
      source: 'Python FastAPI Agent'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'Summarize board progress',
    'Which tasks are overdue?',
    'Show urgent work items',
    'Summarize today’s activities'
  ];

  const handleSend = async (promptText) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: textToSend,
        boardId: activeBoard?.id || null
      });

      const aiData = res.data.data;

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: aiData.response,
        toolsUsed: aiData.tools_used || aiData.toolsUsed || [],
        reasoning: aiData.reasoning || [],
        source: aiData.source
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI chat failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `⚠️ **Error communicating with AI service:** ${err.response?.data?.error || err.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>AI Kanban Assistant</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                Agentic
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Scoped to branch: {tenantName}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Security Context Banner */}
      <div className="px-5 py-2 bg-slate-800/40 border-b border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span>Strict Multi-Tenant Isolation: Cannot access external branch records.</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-3.5 shadow-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
              }`}
            >
              {/* Tool Execution Badge for Assistant */}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="mb-2 pb-2 border-b border-slate-700/50 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-400 font-semibold">Tools:</span>
                  {m.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-indigo-300"
                    >
                      {typeof tool === 'object' ? tool.tool : tool}
                    </span>
                  ))}
                </div>
              )}

              {/* Message text with basic markdown formatting */}
              <div className="whitespace-pre-wrap space-y-1">
                {m.text.split('\n').map((line, idx) => {
                  if (line.startsWith('### ')) {
                    return <h4 key={idx} className="font-bold text-slate-100 mt-2 mb-1">{line.replace('### ', '')}</h4>;
                  }
                  if (line.startsWith('- ')) {
                    return <div key={idx} className="ml-2">• {line.replace('- ', '')}</div>;
                  }
                  return <div key={idx}>{line}</div>;
                })}
              </div>

              {m.source && (
                <div className="mt-2 text-[9px] text-slate-400 italic">
                  Runtime: {m.source}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
            <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            <span>Agent is selecting tools and analyzing branch metrics...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Suggested Inquiries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask a question about this board..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !inputPrompt.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
