'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_TEXTS = [
  '正在整理剑道服……',
  '泡茶中，请稍候……',
  '今天会是怎样的一天呢？',
  '雪花正在飘落……',
  '绫华正在赶来的路上……',
  '让我把扇子收好……',
];

const ICE_CRYSTAL = (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <path d="M32 4L36 16L48 8L40 20L56 24L44 32L56 40L40 44L48 56L36 48L32 60L28 48L16 56L24 44L8 40L20 32L8 24L24 20L16 8L28 16L32 4Z"
      fill="rgba(184,220,232,0.3)" stroke="rgba(184,220,232,0.6)" strokeWidth="1.5" />
    <circle cx="32" cy="32" r="8" fill="rgba(184,220,232,0.5)" />
  </svg>
);

interface SplashScreenProps {
  onComplete: () => void;
  ready?: boolean;
}

export default function SplashScreen({ onComplete, ready }: SplashScreenProps) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const textTimer = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 800);
    return () => clearInterval(textTimer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(onComplete, 600);
    return () => clearTimeout(timer);
  }, [ready, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(170deg, #0f1a24 0%, #1a2d3c 40%, #223b4d 70%, #0f1a24 100%)',
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Ice crystal breathing animation */}
        <motion.div
          className="w-20 h-20 mb-8"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.75, 1, 0.75],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {ICE_CRYSTAL}
        </motion.div>

        {/* Loading text */}
        <motion.p
          key={textIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="text-ice-300/80 text-sm tracking-wider font-serif"
        >
          {LOADING_TEXTS[textIndex]}
        </motion.p>

        {/* Progress dots */}
        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-ice-400/50"
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Subtle snowflake decorations */}
        <SnowflakeDecoration />
      </motion.div>
    </AnimatePresence>
  );
}

function SnowflakeDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-ice-300/15 text-lg"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-5%`,
          }}
          animate={{
            y: ['0vh', '105vh'],
            x: [0, Math.random() * 40 - 20],
            opacity: [0, 0.3, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            delay: Math.random() * 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          ❄
        </motion.div>
      ))}
    </div>
  );
}
