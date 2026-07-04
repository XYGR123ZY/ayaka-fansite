'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SnowfallCanvas from './SnowfallCanvas';
import Link from 'next/link';

interface HomePageProps {
  onNavigate?: (section: string) => void;
}

const AYAKA_GREETINGS = [
  '这里……就是你的世界啊。',
  '今天外面的阳光真好——适合出门走走呢。',
  '你来了。我刚好泡了茶……要一起喝吗？',
  '早上练完剑，感觉整个世界都清爽了。',
];

export default function HomePage({ onNavigate }: HomePageProps) {
  const greeting = AYAKA_GREETINGS[Math.floor(Math.random() * AYAKA_GREETINGS.length)];
  const [avatarSrc] = useState<string>('/api/random-image?file=绫华美图1.webp');

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Layer 0: Snowfall background */}
      <SnowfallCanvas />

      {/* Layer 1: Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-ice-900/40 via-transparent to-ice-900/60 pointer-events-none" />

      {/* Layer 2: Content */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 pt-16 pb-8">
        {/* Hero section */}
        <motion.div
          className="flex flex-col items-center text-center mt-8 md:mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {/* Ayaka avatar from local image/ */}
          <motion.div
            className="w-40 h-40 md:w-52 md:h-52 rounded-full mb-6 relative overflow-hidden"
            animate={{
              boxShadow: [
                '0 0 40px rgba(184,220,232,0.15), 0 0 80px rgba(184,220,232,0.08)',
                '0 0 60px rgba(184,220,232,0.25), 0 0 100px rgba(184,220,232,0.12)',
                '0 0 40px rgba(184,220,232,0.15), 0 0 80px rgba(184,220,232,0.08)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="神里绫华"
                className="w-full h-full object-cover animate-breathe"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-b from-ice-300/15 to-ice-600/20 border border-ice-300/15 flex items-center justify-center">
                <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 opacity-30">
                  <path d="M40 8L44 24L56 16L48 28L64 32L48 36L56 48L44 40L40 56L36 40L24 48L32 36L16 32L32 28L24 16L36 24L40 8Z"
                    fill="rgba(184,220,232,0.6)" stroke="rgba(184,220,232,0.4)" strokeWidth="1" />
                </svg>
              </div>
            )}
          </motion.div>

          {/* Greeting text */}
          <motion.p
            className="text-lg md:text-xl text-ice-200/90 font-serif italic max-w-md leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            &ldquo;{greeting}&rdquo;
          </motion.p>

          <motion.p
            className="mt-3 text-ice-400/60 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            —— 神里绫华
          </motion.p>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mt-12 md:mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <FeatureCard
            icon="💬"
            title="与绫华对话"
            desc="她在这里等你——聊聊今天发生的事"
            href="/chat"
          />
          <FeatureCard
            icon="🖼️"
            title="画廊"
            desc="立绘、截图、名场面——她的每一个瞬间"
            href="/gallery"
          />
          <FeatureCard
            icon="📖"
            title="剧情回溯"
            desc="从稻妻到现世，重温她的故事"
            href="/story"
          />
          <FeatureCard
            icon="✨"
            title="AI 生图"
            desc="用文字描绘你心中的绫华"
            href="/generate"
          />
        </motion.div>

        {/* Bottom hint */}
        <motion.p
          className="mt-auto mb-4 text-ice-500/40 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2, duration: 0.6 }}
        >
          向下滚动探索更多
        </motion.p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, href }: {
  icon: string;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        className="glass p-5 cursor-pointer group relative overflow-hidden"
        whileHover={{
          scale: 1.02,
          boxShadow: '0 0 30px rgba(184,220,232,0.1)',
          borderColor: 'rgba(184,220,232,0.3)',
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.3 }}
      >
        {/* Hover glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-ice-300/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10">
          <span className="text-2xl">{icon}</span>
          <h3 className="mt-2 text-ice-100 font-semibold text-sm tracking-wide">{title}</h3>
          <p className="mt-1 text-ice-400/60 text-xs">{desc}</p>
        </div>
      </motion.div>
    </Link>
  );
}
