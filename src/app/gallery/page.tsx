'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SnowfallCanvas from '@/components/SnowfallCanvas';
import Link from 'next/link';

type Category = 'all' | 'official' | 'fanart' | 'gameplay' | 'moments';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'official', label: '官方立绘' },
  { key: 'fanart', label: '同人精选' },
  { key: 'gameplay', label: '游戏截图' },
  { key: 'moments', label: '名场面' },
];

interface GalleryImage {
  id: number;
  src: string;
  title: string;
  category: string;
  artist?: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadImages = useCallback(async () => {
    try {
      const res = await fetch('/api/images');
      const data = await res.json();
      if (data.images) setImages(data.images);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  const filtered = activeCategory === 'all'
    ? images
    : images.filter(img => img.category === activeCategory);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const navigateLightbox = (dir: -1 | 1) => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + dir + filtered.length) % filtered.length);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SnowfallCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-ice-900/40 via-transparent to-ice-900/60 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-12">
        <motion.div className="pt-6 mb-8" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <Link href="/" className="text-ice-400/50 hover:text-ice-300/70 text-sm transition-colors">← 返回</Link>
        </motion.div>

        <motion.h1 className="text-2xl md:text-3xl font-serif text-ice-100 text-center mb-2"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          画廊
        </motion.h1>
        <motion.p className="text-ice-400/50 text-sm text-center mb-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          她的每一个瞬间，都值得被记住
        </motion.p>

        {/* Category tabs */}
        <motion.div className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all border ${
                activeCategory === cat.key
                  ? 'bg-ice-500/25 border-ice-400/30 text-ice-200'
                  : 'glass border-ice-300/10 text-ice-400/50 hover:text-ice-300/70 hover:border-ice-300/20'
              }`}>
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <motion.div className="w-10 h-10 mx-auto mb-3" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
              <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                <path d="M32 4L36 16L48 8L40 20L56 24L44 32L56 40L40 44L48 56L36 48L32 60L28 48L16 56L24 44L8 40L20 32L8 24L24 20L16 8L28 16L32 4Z"
                  fill="rgba(184,220,232,0.3)" stroke="rgba(184,220,232,0.5)" strokeWidth="1" />
              </svg>
            </motion.div>
            <p className="text-ice-400/40 text-sm">加载中……</p>
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" layout>
            <AnimatePresence mode="popLayout">
              {filtered.map((img, index) => (
                <motion.div key={img.id} layout
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}
                  className="glass overflow-hidden cursor-pointer group"
                  onClick={() => openLightbox(index)}>
                  <div className="aspect-[3/4] bg-gradient-to-br from-ice-700/40 to-ice-800/60 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ice-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <div className="w-full p-3">
                        <p className="text-ice-100 text-xs font-medium">{img.title}</p>
                        {img.artist && <p className="text-ice-400/60 text-xs mt-0.5">画师: {img.artist}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && filtered.length === 0 && (
          <motion.p className="text-center text-ice-400/40 mt-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            这个分类暂时还没有图片呢……
          </motion.p>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ice-900/90 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeLightbox}>
            <motion.div className="relative max-w-4xl w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="glass p-2">
                <div className="relative flex items-center justify-center rounded-xl overflow-hidden bg-ice-800/50" style={{ maxHeight: '80vh' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filtered[lightboxIndex].src} alt={filtered[lightboxIndex].title}
                    className="max-w-full max-h-[80vh] object-contain" />
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-ice-100 text-sm">{filtered[lightboxIndex].title}</p>
                    {filtered[lightboxIndex].artist && (
                      <p className="text-ice-400/50 text-xs mt-0.5">画师: {filtered[lightboxIndex].artist}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const msg = `帮我讲讲「${filtered[lightboxIndex].title}」这张图背后的故事`;
                      window.location.href = `/chat?hint=${encodeURIComponent(msg)}`;
                    }} className="text-xs px-3 py-1.5 rounded-full glass text-ice-300/60 hover:text-ice-200 border border-ice-300/10 transition-all">
                      让绫华说说这张图
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <button onClick={() => navigateLightbox(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full glass flex items-center justify-center text-ice-300/60 hover:text-ice-200 transition-colors text-xl">
                ‹
              </button>
              <button onClick={() => navigateLightbox(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full glass flex items-center justify-center text-ice-300/60 hover:text-ice-200 transition-colors text-xl">
                ›
              </button>

              {/* Close */}
              <button onClick={closeLightbox}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full glass flex items-center justify-center text-ice-300/60 hover:text-ice-200 transition-colors text-lg">
                ×
              </button>

              {/* Counter */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-ice-400/40 text-xs">
                {lightboxIndex + 1} / {filtered.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
