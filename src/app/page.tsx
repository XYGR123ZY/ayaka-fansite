'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SplashScreen from '@/components/SplashScreen';
import HomePage from '@/components/HomePage';

export default function Page() {
  const [showSplash, setShowSplash] = useState(true);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPageReady(true));
    });
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <SplashScreen
              ready={pageReady}
              onComplete={() => setShowSplash(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="home"
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <HomePage />
      </motion.div>
    </>
  );
}
