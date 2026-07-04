'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const hintSent = useRef(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle hint from gallery
  useEffect(() => {
    const hint = searchParams.get('hint');
    if (hint && !hintSent.current) {
      hintSent.current = true;
      setInput(hint);
      // Auto-send after a short delay
      setTimeout(() => {
        const msg: Message = { role: 'user', content: hint };
        setMessages([msg]);
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [msg] }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error('API error');
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');
            const decoder = new TextDecoder();
            let fullContent = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
              for (const line of lines) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setStreamingContent(fullContent);
                  }
                } catch { /* skip */ }
              }
            }
            if (fullContent) {
              setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
            }
          })
          .catch(() => {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: '……抱歉，刚才信号不太好。你能再说一遍吗？' },
            ]);
          })
          .finally(() => {
            setIsStreaming(false);
            setStreamingContent('');
          });
      }, 500);
    }
  }, [searchParams]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [userMsg] }),
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
            if (parsed.error) {
              console.error('Stream error:', parsed.error);
            }
          } catch {
            // skip
          }
        }
      }

      if (fullContent) {
        setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '……抱歉，刚才信号不太好。你能再说一遍吗？' },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      inputRef.current?.focus();
    }
  }, [input, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTTS = (text: string) => {
    // TTS placeholder — will implement when user figures out the API
    console.log('TTS requested:', text.slice(0, 50));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-light rounded-2xl mx-3 mt-3 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-ice-300/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/random-image?file=绫华美图1.webp" alt="绫华" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-ice-100 text-sm font-medium">神里绫华</p>
          <p className="text-ice-400/50 text-xs">
            {isStreaming ? '正在输入……' : '在线'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-ice-400/40 text-sm">
              绫华在这里等你——发送第一条消息吧
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['今天过得怎么样？', '想喝奶茶吗？', '教我一句稻妻话吧'].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs px-3 py-1.5 rounded-full glass border-ice-300/10 text-ice-300/60 hover:text-ice-200 hover:border-ice-300/25 transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ayaka'}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleTTS(msg.content)}
                    className="mt-2 text-ice-400/40 hover:text-ice-300/60 text-xs transition-colors"
                    title="语音朗读"
                  >
                    🔊 朗读
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="chat-bubble-ayaka">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {streamingContent}
                <span className="inline-block w-1.5 h-4 bg-ice-300/60 ml-0.5 animate-pulse" />
              </p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="glass flex items-center gap-2 px-4 py-2 rounded-2xl">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="说点什么……"
            className="flex-1 bg-transparent text-ice-100 text-sm placeholder-ice-500/40 outline-none py-1"
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="w-8 h-8 rounded-full bg-ice-500/20 hover:bg-ice-400/30 border border-ice-400/15 flex items-center justify-center text-ice-300 disabled:opacity-30 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
