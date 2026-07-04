'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import SnowfallCanvas from '@/components/SnowfallCanvas';
import ChatUI from '@/components/ChatUI';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layers */}
      <SnowfallCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-ice-900/40 via-transparent to-ice-900/60 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto">
        {/* Back button */}
        <motion.div
          className="px-4 pt-4"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/" className="text-ice-400/50 hover:text-ice-300/70 text-sm transition-colors">
            ← 返回
          </Link>
        </motion.div>

        {/* Chat container */}
        <motion.div
          className="flex-1 flex flex-col min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center">
              <p className="text-ice-400/40 text-sm">加载中……</p>
            </div>
          }>
            <ChatUI />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
