'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SnowfallCanvas from '@/components/SnowfallCanvas';
import Link from 'next/link';

const TEMPLATES = [
  { key: 'portrait', label: '人物肖像', icon: '🎭', desc: '特写镜头，突出面部细节' },
  { key: 'fullbody', label: '全身立绘', icon: '🧍', desc: '完整人物，展示服装姿态' },
  { key: 'scene', label: '场景氛围', icon: '🌄', desc: '环境为主，强调氛围感' },
  { key: 'casual', label: '日常便装', icon: '👗', desc: '现代休闲穿搭' },
  { key: 'battle', label: '战斗姿态', icon: '⚔️', desc: '动态动作，冰晶特效' },
  { key: 'sakura', label: '樱花季节', icon: '🌸', desc: '春日樱花，粉色系' },
];

const ASPECT_RATIOS = [
  { key: '3:4', label: '3:4 竖版', icon: '▯' },
  { key: '1:1', label: '1:1 方形', icon: '□' },
  { key: '4:3', label: '4:3 横版', icon: '▭' },
  { key: '9:16', label: '9:16 竖长', icon: '|' },
  { key: '16:9', label: '16:9 宽屏', icon: '—' },
];

interface CachedImage {
  id: number;
  prompt: string;
  model: string;
  image_size: string;
  local_path: string;
  template: string | null;
  created_at: string;
}

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RefImages {
  character?: string;
  environment?: string;
  pose?: string;
  expression?: string;
  clothing?: string;
}

export default function GeneratePage() {
  const [mode, setMode] = useState<'manual' | 'assistant'>('manual');
  const [genMode, setGenMode] = useState<'normal' | 'instantid'>('normal');
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [numImages, setNumImages] = useState(1);
  const [steps, setSteps] = useState(25);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [refImages, setRefImages] = useState<RefImages>({});
  const [faceImage, setFaceImage] = useState<string>('');
  const [faceFileName, setFaceFileName] = useState('');
  const [faceMode, setFaceMode] = useState<'random' | 'upload'>('random');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [cachedImages, setCachedImages] = useState<CachedImage[]>([]);
  const [showCache, setShowCache] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRefDetail, setShowRefDetail] = useState(false);
  const fileInputRefs = {
    character: useRef<HTMLInputElement>(null),
    environment: useRef<HTMLInputElement>(null),
    pose: useRef<HTMLInputElement>(null),
    expression: useRef<HTMLInputElement>(null),
    clothing: useRef<HTMLInputElement>(null),
    face: useRef<HTMLInputElement>(null),
  };

  // Refinement state
  const [refineImage, setRefineImage] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [refineMessages, setRefineMessages] = useState<AssistantMessage[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [refineStreaming, setRefineStreaming] = useState(false);
  const [refineStreamContent, setRefineStreamContent] = useState('');
  const refineEndRef = useRef<HTMLDivElement>(null);

  // Prompt assistant state
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantStreaming, setAssistantStreaming] = useState(false);
  const [assistantStreamContent, setAssistantStreamContent] = useState('');
  const assistantEndRef = useRef<HTMLDivElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const loadCachedImages = useCallback(async () => {
    try {
      const res = await fetch('/api/generate/images');
      const data = await res.json();
      if (data.images) setCachedImages(data.images);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCachedImages(); }, [loadCachedImages]);
  useEffect(() => { assistantEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [assistantMessages, assistantStreamContent]);
  useEffect(() => { refineEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [refineMessages, refineStreamContent]);

  const handleRefUpload = (key: keyof RefImages) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRefImages(prev => ({ ...prev, [key]: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFaceUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRandomFace = async () => {
    try {
      const exclude = faceFileName ? encodeURIComponent(faceFileName) : '';
      const res = await fetch(`/api/random-image?t=${Date.now()}${exclude ? `&exclude=${exclude}` : ''}`);
      const newFileName = decodeURIComponent(res.headers.get('X-Filename') || '');
      if (newFileName) setFaceFileName(newFileName);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(blob);
    } catch { /* ignore */ }
  };

  const removeRef = (key: keyof RefImages) => {
    setRefImages(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const handleGenerate = async (overrideRefineImage?: string, overridePrompt?: string) => {
    const activePrompt = overridePrompt || prompt;
    if (!activePrompt.trim()) return;
    setIsGenerating(true);
    setError('');
    if (!overrideRefineImage) setGeneratedImages([]);

    try {
      const isRefine = !!overrideRefineImage;
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activePrompt.trim(),
          template: template || undefined,
          aspectRatio,
          numImages: isRefine ? 1 : numImages,
          steps,
          guidanceScale,
          faceImage: genMode === 'instantid' ? faceImage : undefined,
          mode: genMode === 'instantid' && faceImage ? 'instantid' : 'normal',
          refImages: Object.keys(refImages).length > 0 ? refImages : undefined,
          refineImage: overrideRefineImage || undefined,
          refineMode: isRefine,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      if (data.images?.length > 0) {
        if (overrideRefineImage) {
          setGeneratedImages(prev => [...data.images, ...prev]);
        } else {
          setGeneratedImages(data.images);
        }
        loadCachedImages();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendAssistantMessage = async (overrideText?: string) => {
    const text = (overrideText ?? assistantInput).trim();
    if (!text || assistantStreaming) return;
    const newMessages: AssistantMessage[] = [...assistantMessages, { role: 'user', content: text }];
    setAssistantMessages(newMessages);
    setAssistantInput('');
    setAssistantStreaming(true);
    setAssistantStreamContent('');
    try {
      const res = await fetch('/api/generate/prompt-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try { const parsed = JSON.parse(data); if (parsed.content) { full += parsed.content; setAssistantStreamContent(full); } } catch { /* skip */ }
        }
      }
      if (full) {
        setAssistantMessages([...newMessages, { role: 'assistant', content: full }]);
        const match = full.match(/\[FINAL_PROMPT\]\s*([\s\S]*)/);
        if (match) { setPrompt(match[1].trim()); setMode('manual'); }
      }
    } catch {
      setAssistantMessages([...newMessages, { role: 'assistant', content: '抱歉，出了点问题，请重试。' }]);
    } finally { setAssistantStreaming(false); setAssistantStreamContent(''); }
  };

  const startRefine = (imageSrc: string, originalPrompt?: string) => {
    setRefineImage(imageSrc);
    setRefinePrompt(originalPrompt || prompt);
    setRefineMessages([]);
    setRefineInput('');
  };

  const cancelRefine = () => {
    setRefineImage(null);
    setRefineMessages([]);
    setRefineStreamContent('');
  };

  const sendRefineMessage = async (overrideText?: string) => {
    const text = (overrideText ?? refineInput).trim();
    if (!text || refineStreaming) return;
    const contextMsg = refinePrompt ? `[原始提示词] ${refinePrompt}\n\n${text}` : text;
    const newMessages: AssistantMessage[] = [...refineMessages, { role: 'user', content: contextMsg }];
    setRefineMessages(newMessages);
    setRefineInput('');
    setRefineStreaming(true);
    setRefineStreamContent('');
    try {
      const res = await fetch('/api/generate/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try { const parsed = JSON.parse(data); if (parsed.content) { full += parsed.content; setRefineStreamContent(full); } } catch { /* skip */ }
        }
      }
      if (full) {
        const updated: AssistantMessage[] = [...newMessages, { role: 'assistant' as const, content: full }];
        setRefineMessages(updated);
        const match = full.match(/\[REFINE_PROMPT\]\s*([\s\S]*)/);
        if (match && refineImage) {
          handleGenerate(refineImage, match[1].trim());
          cancelRefine();
        }
      }
    } catch {
      setRefineMessages([...newMessages, { role: 'assistant', content: '抱歉，出了点问题，请重试。' }]);
    } finally { setRefineStreaming(false); setRefineStreamContent(''); }
  };

  const deleteCachedImage = async (id: number) => {
    try {
      await fetch('/api/generate/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setCachedImages(prev => prev.filter(img => img.id !== id));
    } catch { /* ignore */ }
  };

  const hasAnyRef = Object.values(refImages).some(Boolean);

  const RefUploadBtn = ({ label, icon, sublabel, refKey }: { label: string; icon: string; sublabel?: string; refKey: keyof RefImages }) => (
    <div className="flex items-center gap-2">
      <input ref={fileInputRefs[refKey]} type="file" accept="image/*" className="hidden" onChange={handleRefUpload(refKey)} />
      <button onClick={() => fileInputRefs[refKey].current?.click()}
        className={`glass px-3 py-1.5 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${refImages[refKey] ? 'border-ice-400/30 text-ice-200' : 'border-ice-300/10 text-ice-400/50 hover:text-ice-300'}`}>
        <span>{icon}</span>
        <span>{label}</span>
      </button>
      {refImages[refKey] && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={refImages[refKey]} alt={label} className="w-10 h-10 rounded-lg object-cover border border-ice-300/20" />
          <button onClick={() => removeRef(refKey)} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-ice-700 text-ice-300 text-[8px] flex items-center justify-center">×</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SnowfallCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-ice-900/40 via-transparent to-ice-900/60 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 pb-16">
        <motion.div className="pt-6 mb-6 flex items-center justify-between" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <Link href="/" className="text-ice-400/50 hover:text-ice-300/70 text-sm transition-colors">← 返回</Link>
          <button onClick={() => { setShowCache(!showCache); if (!showCache) loadCachedImages(); }} className="text-xs px-3 py-1.5 rounded-full glass border-ice-300/10 text-ice-300/60 hover:text-ice-200 transition-all">
            {showCache ? '返回生成' : `我的图片 (${cachedImages.length})`}
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {showCache ? (
            <motion.div key="cache" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-serif text-ice-100 mb-4">我的生成记录</h2>
              {cachedImages.length === 0 ? (
                <p className="text-ice-400/40 text-center mt-16">还没有生成过图片哦……</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cachedImages.map(img => (
                    <motion.div key={img.id} className="glass overflow-hidden group relative cursor-pointer" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      onDoubleClick={() => setLightboxSrc(img.local_path)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.local_path} alt={img.prompt} className="w-full aspect-[3/4] object-cover" />
                      <div className="absolute inset-0 bg-ice-900/0 group-hover:bg-ice-900/70 transition-all duration-300 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100">
                        <p className="text-ice-100 text-xs line-clamp-2 mb-1">{img.prompt}</p>
                        <p className="text-ice-400/40 text-[10px]">{new Date(img.created_at).toLocaleString('zh-CN')}</p>
                        <div className="flex gap-2 mt-2">
                          <a href={img.local_path} download onClick={e => e.stopPropagation()} className="text-xs text-ice-300/60 hover:text-ice-200">保存 ↓</a>
                          <button onClick={e => { e.stopPropagation(); setPrompt(img.prompt); setShowCache(false); }} className="text-xs text-ice-300/60 hover:text-ice-200">复用提示词</button>
                          <button onClick={e => { e.stopPropagation(); startRefine(img.local_path, img.prompt); setShowCache(false); }} className="text-xs text-ice-300/60 hover:text-ice-200">精修</button>
                          <button onClick={e => { e.stopPropagation(); deleteCachedImage(img.id); }} className="text-xs text-red-300/50 hover:text-red-300 ml-auto">删除</button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Refinement Panel */}
              {refineImage && (
                <motion.div className="glass p-4 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-start gap-4 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refineImage} alt="待精修" className="w-24 h-32 rounded-lg object-cover border border-ice-400/20" />
                    <div className="flex-1">
                      <p className="text-ice-200 text-sm font-medium mb-1">精修模式</p>
                      <p className="text-ice-400/50 text-xs mb-2">描述你想调整的部分，AI 会保持原图构图只做细微修改</p>
                      {refinePrompt && <p className="text-ice-400/30 text-[10px] line-clamp-2">原提示词: {refinePrompt}</p>}
                      <button onClick={cancelRefine} className="text-red-300/50 hover:text-red-300 text-xs mt-2">取消精修</button>
                    </div>
                  </div>
                  {/* Refine chat */}
                  <div className="glass p-3 mb-3 max-h-[200px] overflow-y-auto">
                    {refineMessages.length === 0 && !refineStreamContent && (
                      <p className="text-ice-400/40 text-xs text-center py-4">描述你想修改的部分，例如"把表情改成微笑"、"背景换成雪景"</p>
                    )}
                    {refineMessages.map((msg, i) => (
                      <div key={i} className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={msg.role === 'user' ? 'chat-bubble-user text-xs' : 'chat-bubble-ayaka text-xs'} style={{ maxWidth: '90%' }}>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {refineStreaming && refineStreamContent && (
                      <div className="flex justify-start mb-2">
                        <div className="chat-bubble-ayaka text-xs" style={{ maxWidth: '90%' }}>
                          <p className="leading-relaxed whitespace-pre-wrap">{refineStreamContent}<span className="inline-block w-1.5 h-3 bg-ice-300/60 ml-0.5 animate-pulse" /></p>
                        </div>
                      </div>
                    )}
                    <div ref={refineEndRef} />
                  </div>
                  <div className="glass flex items-center gap-2 px-3 py-2 rounded-xl">
                    <input value={refineInput} onChange={e => setRefineInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRefineMessage(); } }}
                      placeholder="描述你想精修的部分……"
                      className="flex-1 bg-transparent text-ice-100 text-sm placeholder-ice-500/40 outline-none py-1" disabled={refineStreaming} />
                    <button onClick={() => sendRefineMessage()} disabled={refineStreaming || !refineInput.trim()}
                      className="w-8 h-8 rounded-full bg-ice-500/20 hover:bg-ice-400/30 border border-ice-400/15 flex items-center justify-center text-ice-300 disabled:opacity-30 transition-all">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-full text-xs transition-all border ${mode === 'manual' ? 'bg-ice-500/25 border-ice-400/30 text-ice-200' : 'glass border-ice-300/10 text-ice-400/50'}`}>
                  手动输入
                </button>
                <button onClick={() => setMode('assistant')} className={`px-4 py-2 rounded-full text-xs transition-all border ${mode === 'assistant' ? 'bg-ice-500/25 border-ice-400/30 text-ice-200' : 'glass border-ice-300/10 text-ice-400/50'}`}>
                  AI 助手引导 ✨
                </button>
              </div>

              <AnimatePresence mode="wait">
                {mode === 'assistant' ? (
                  <motion.div key="assistant" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="glass p-4 mb-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                      {assistantMessages.length === 0 && !assistantStreamContent && (
                        <div className="text-center mt-8">
                          <p className="text-ice-400/50 text-sm mb-2">AI 助手会一步步引导你描述想要的画面</p>
                          <p className="text-ice-400/30 text-xs">回答几个简单的问题，就能生成专业提示词</p>
                          <button onClick={() => {
                            const initMsg = '你好，我想生成一张绫华的图片';
                            setAssistantMessages([{ role: 'user', content: initMsg }]);
                            sendAssistantMessage(initMsg);
                          }} className="mt-4 px-5 py-2 rounded-full bg-ice-500/20 hover:bg-ice-400/30 border border-ice-400/15 text-ice-200 text-sm transition-all">
                            开始引导
                          </button>
                        </div>
                      )}
                      {assistantMessages.map((msg, i) => (
                        <div key={i} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ayaka'}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {assistantStreaming && assistantStreamContent && (
                        <div className="flex justify-start mb-3">
                          <div className="chat-bubble-ayaka">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{assistantStreamContent}<span className="inline-block w-1.5 h-4 bg-ice-300/60 ml-0.5 animate-pulse" /></p>
                          </div>
                        </div>
                      )}
                      <div ref={assistantEndRef} />
                    </div>
                    <div className="glass flex items-center gap-2 px-4 py-2 rounded-2xl">
                      <input value={assistantInput} onChange={e => setAssistantInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAssistantMessage(); } }}
                        placeholder="回答助手的问题……"
                        className="flex-1 bg-transparent text-ice-100 text-sm placeholder-ice-500/40 outline-none py-1" disabled={assistantStreaming} />
                      <button onClick={() => sendAssistantMessage()} disabled={assistantStreaming || !assistantInput.trim()}
                        className="w-8 h-8 rounded-full bg-ice-500/20 hover:bg-ice-400/30 border border-ice-400/15 flex items-center justify-center text-ice-300 disabled:opacity-30 transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="manual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    {/* Prompt */}
                    <div className="glass p-5 mb-4">
                      <label className="text-ice-300/60 text-xs mb-2 block">描述你想要的画面</label>
                      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                        placeholder="例如：穿着淡蓝色和服的绫华，站在樱花树下，微风吹过花瓣纷飞……"
                        className="w-full bg-transparent text-ice-100 text-sm placeholder-ice-500/30 outline-none resize-none h-20 leading-relaxed" disabled={isGenerating} />
                      <p className="text-ice-500/20 text-[10px] mt-1">系统会自动补充绫华的基础特征描述</p>
                    </div>

                    {/* Templates */}
                    <div className="mb-4">
                      <p className="text-ice-400/50 text-xs mb-2">模板风格</p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {TEMPLATES.map(t => (
                          <button key={t.key} onClick={() => setTemplate(template === t.key ? '' : t.key)}
                            className={`glass p-2.5 rounded-xl text-center transition-all border ${template === t.key ? 'border-ice-400/40 bg-ice-500/15' : 'border-ice-300/5 hover:border-ice-300/15'}`}>
                            <span className="text-lg">{t.icon}</span>
                            <p className="text-ice-200 text-[10px] mt-1">{t.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="mb-4">
                      <p className="text-ice-400/50 text-xs mb-2">图片尺寸</p>
                      <div className="flex flex-wrap gap-2">
                        {ASPECT_RATIOS.map(ar => (
                          <button key={ar.key} onClick={() => setAspectRatio(ar.key)}
                            className={`px-3 py-1.5 rounded-full text-xs transition-all border ${aspectRatio === ar.key ? 'bg-ice-500/25 border-ice-400/30 text-ice-200' : 'glass border-ice-300/10 text-ice-400/50 hover:text-ice-300'}`}>
                            {ar.icon} {ar.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reference Images */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-ice-400/50 text-xs">参考图片（可选）</p>
                        <button onClick={() => setShowRefDetail(!showRefDetail)} className="text-ice-400/30 text-[10px] hover:text-ice-300/50 transition-colors">
                          {showRefDetail ? '收起细分 ▲' : '展开细分 ▼'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <RefUploadBtn label="人物本体" icon="👤" refKey="character" />
                        <RefUploadBtn label="环境场景" icon="🏞️" refKey="environment" />
                        <AnimatePresence>
                          {showRefDetail && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-clip space-y-2 pl-4 border-l border-ice-400/10">
                              <p className="text-ice-400/30 text-[10px]">以下细分项覆盖人物本体参考的对应部分</p>
                              <RefUploadBtn label="动作姿势" icon="🏃" refKey="pose" />
                              <RefUploadBtn label="面部神态" icon="😊" refKey="expression" />
                              <RefUploadBtn label="服装服饰" icon="👘" refKey="clothing" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Character Consistency */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-ice-400/50 text-xs">角色一致性模式</p>
                        <span className="group relative">
                          <span className="text-ice-500/40 text-[10px] cursor-help border border-ice-400/20 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-ice-800 border border-ice-400/20 text-ice-300/70 text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            使用 Qwen Image Edit 模型，传入面部参考图保持角色一致性
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                          if (genMode === 'instantid') { setGenMode('normal'); setFaceImage(''); }
                          else { setGenMode('instantid'); if (!faceImage) handleRandomFace(); }
                        }} className={`px-4 py-2 rounded-xl text-xs transition-all border ${genMode === 'instantid' ? 'bg-ice-500/25 border-ice-400/40 text-ice-200' : 'glass border-ice-300/10 text-ice-400/50 hover:text-ice-300'}`}>
                          {genMode === 'instantid' ? '✓ 已开启' : '开启'}
                        </button>
                        {genMode === 'instantid' && (
                          <div className="flex items-center gap-2">
                            <input ref={fileInputRefs.face} type="file" accept="image/*" className="hidden" onChange={handleFaceUploadFile} />
                            <button onClick={() => fileInputRefs.face.current?.click()}
                              className="glass px-3 py-1.5 rounded-lg text-xs text-ice-300/60 hover:text-ice-200 border border-ice-300/10 transition-all">
                              上传
                            </button>
                            <button onClick={handleRandomFace}
                              className="glass px-3 py-1.5 rounded-lg text-xs text-ice-300/60 hover:text-ice-200 border border-ice-300/10 transition-all">
                              随机
                            </button>
                            {faceImage && (
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={faceImage} alt="面部参考" className="w-10 h-10 rounded-lg object-cover border border-ice-400/30" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="mb-4">
                      <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-ice-400/40 text-xs hover:text-ice-300/60 transition-colors">
                        {showAdvanced ? '▼' : '▶'} 高级参数
                      </button>
                      <AnimatePresence>
                        {showAdvanced && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-clip mt-2 glass p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-ice-300/60 text-xs">生成数量</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map(n => (
                                  <button key={n} onClick={() => setNumImages(n)}
                                    className={`w-7 h-7 rounded-lg text-xs ${numImages === n ? 'bg-ice-500/25 text-ice-200' : 'text-ice-400/50 hover:text-ice-300'}`}>{n}</button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-ice-300/60 text-xs flex items-center gap-1">
                                采样步数 ({steps})
                                <span className="group relative">
                                  <span className="text-ice-500/40 text-[10px] cursor-help border border-ice-400/20 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-ice-800 border border-ice-400/20 text-ice-300/70 text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    AI 生成图片时的&quot;打磨次数&quot;。步数越多细节越精致，但耗时更长。一般 20-30 步足够
                                  </span>
                                </span>
                              </span>
                              <input type="range" min={15} max={50} value={steps} onChange={e => setSteps(+e.target.value)} className="w-32 accent-ice-400" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-ice-300/60 text-xs flex items-center gap-1">
                                引导系数 ({guidanceScale})
                                <span className="group relative">
                                  <span className="text-ice-500/40 text-[10px] cursor-help border border-ice-400/20 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-ice-800 border border-ice-400/20 text-ice-300/70 text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    AI 对提示词的&quot;听话程度&quot;。值越高越严格按描述生成，值越低越自由发挥。推荐 5-10
                                  </span>
                                </span>
                              </span>
                              <input type="range" min={1} max={20} step={0.5} value={guidanceScale} onChange={e => setGuidanceScale(+e.target.value)} className="w-32 accent-ice-400" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Generate Button */}
                    <motion.button onClick={() => handleGenerate()} disabled={isGenerating || !prompt.trim()}
                      className="w-full py-3 rounded-2xl bg-ice-500/20 hover:bg-ice-400/30 border border-ice-400/15 text-ice-200 text-sm disabled:opacity-30 transition-all"
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      {isGenerating ? '正在生成……' : '开始生成'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preset Prompts */}
              {mode === 'manual' && !refineImage && (
                <motion.div className="mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <p className="text-ice-400/40 text-xs mb-2">灵感模板</p>
                  <div className="flex flex-wrap gap-2">
                    {['在樱花树下练剑', '穿着现代连衣裙逛街', '雨天在咖啡馆窗边发呆', '雪地里回眸一笑', '手持扇子的优雅坐姿', '夜晚的屋顶看星星'].map(p => (
                      <button key={p} onClick={() => setPrompt(p)} disabled={isGenerating}
                        className="text-xs px-3 py-1.5 rounded-full glass border-ice-300/10 text-ice-300/50 hover:text-ice-200 hover:border-ice-300/25 transition-all disabled:opacity-30">
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div className="mt-4 glass p-4 border-red-400/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-red-300/70 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Generating Animation */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div className="mt-8 flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="glass p-8 flex flex-col items-center">
                      <motion.div className="w-16 h-16 mb-4" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
                        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                          <path d="M32 4L36 16L48 8L40 20L56 24L44 32L56 40L40 44L48 56L36 48L32 60L28 48L16 56L24 44L8 40L20 32L8 24L24 20L16 8L28 16L32 4Z"
                            fill="rgba(184,220,232,0.3)" stroke="rgba(184,220,232,0.5)" strokeWidth="1" />
                        </svg>
                      </motion.div>
                      <p className="text-ice-300/60 text-sm">正在描绘中……</p>
                      <p className="text-ice-500/30 text-xs mt-1">通常需要 5-15 秒</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generated Images */}
              <AnimatePresence>
                {generatedImages.length > 0 && (
                  <motion.div className="mt-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-ice-400/50 text-xs mb-3">生成结果（已自动缓存）</p>
                    <div className="grid grid-cols-2 gap-3">
                      {generatedImages.map((src, i) => (
                        <motion.div key={i} className="glass overflow-hidden cursor-pointer group"
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                          onDoubleClick={() => setLightboxSrc(src)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`生成结果 ${i + 1}`} className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="p-2 flex justify-between items-center">
                            <button onClick={e => { e.stopPropagation(); startRefine(src); }} className="text-xs text-ice-300/60 hover:text-ice-200 transition-colors">精修 ✨</button>
                            <a href={src} download onClick={e => e.stopPropagation()} className="text-ice-400/50 hover:text-ice-300/70 text-xs transition-colors">保存 ↓</a>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ice-900/90 backdrop-blur-sm cursor-pointer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxSrc(null)}>
            <motion.div className="relative max-w-4xl max-h-[90vh] mx-4"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxSrc} alt="放大预览" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
              <button onClick={() => setLightboxSrc(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full glass flex items-center justify-center text-ice-300/60 hover:text-ice-200 transition-colors text-lg">×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
