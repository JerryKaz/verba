import { Bot, MessageSquare, Send, User, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithAI } from '../services/ai';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: number;
}

export function AIChatBot() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('verba_chat_history');
    return saved ? JSON.parse(saved) : [{
      role: 'model',
      parts: [{ text: "Hello! I'm your Verba Linguistic Assistant. How can I help you with language analysis, translations, or linguistic nuances today?" }],
      timestamp: Date.now()
    }];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('verba_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: input.trim() }],
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatWithAI([...messages, userMessage]);
      const aiMessage: Message = {
        role: 'model',
        parts: [{ text: response }],
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: 'model',
        parts: [{ text: "I'm sorry, I'm having trouble connecting to my linguistic core. Please check your connection and try again." }],
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear chat conversation?")) {
      setMessages([{
        role: 'model',
        parts: [{ text: "Chat cleared. How can I help you further?" }],
        timestamp: Date.now()
      }]);
    }
  };

  return (
    <div className="flex flex-col h-[600px] md:h-[700px] bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden ring-1 ring-black/5">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-widest">Linguistic Assistant</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ready for analysis</span>
            </div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={clearChat}
          className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
          title="Clear History"
        >
          <X className="w-4.5 h-4.5" />
        </motion.button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#FBFBFD]/50"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.timestamp + i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-[13px] leading-relaxed font-medium shadow-sm border ${
                  msg.role === 'user' 
                    ? 'bg-white border-slate-100 text-slate-700 rounded-tr-none' 
                    : 'bg-white border-blue-50 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="markdown-body prose prose-slate prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.parts[0].text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 bg-white border border-blue-50 text-slate-400 text-[11px] font-bold uppercase tracking-widest rounded-2xl rounded-tl-none shadow-sm">
                Analyzing language patterns...
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about grammar, idioms, or linguistic analysis..."
            className="w-full pl-6 pr-14 py-4 bg-[#F5F5F7] border-none rounded-2xl text-[14px] font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
          </motion.button>
        </div>
        <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-widest mt-4">
          Powered by Gemini 1.5 Linguistic Engine
        </p>
      </div>
    </div>
  );
}
