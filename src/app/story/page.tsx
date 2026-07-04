'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SnowfallCanvas from '@/components/SnowfallCanvas';
import Link from 'next/link';

interface TimelineEvent {
  id: number;
  title: string;
  chapter: string;
  description: string;
  quote?: string;
  highlight?: boolean;
}

const TIMELINE: TimelineEvent[] = [
  {
    id: 1,
    title: '社奉行的日常',
    chapter: '稻妻 · 间章',
    description: '神里家的大小姐，每日在社奉行处理政务。冰系神之眼的持有者，剑术精湛，被百姓称为"白鹭公主"。但在那优雅的外表下，她也有自己的心事。',
  },
  {
    id: 2,
    title: '初遇旅行者',
    chapter: '稻妻主线 · 第二章',
    description: '旅行者踏入稻妻的土地，与神里绫华在社奉行初次相遇。她以礼相待，却在旅行者身上看到了改变稻妻的可能。',
    quote: '欢迎来到稻妻。我是神里绫华，社奉行所属……请多指教。',
  },
  {
    id: 3,
    title: '花火大会的邀约',
    chapter: '稻妻主线 · 第三章',
    description: '绫华邀请旅行者一同前往花火大会。在漫天烟花下，她跳起了神里流传授的舞蹈——那一刻，不只是冰晶在闪耀。',
    quote: '这支舞……只为你而跳。',
    highlight: true,
  },
  {
    id: 4,
    title: '雷电将军的决战',
    chapter: '稻妻主线 · 第三章',
    description: '眼狩令的阴霾笼罩稻妻。绫华站在反抗军一侧，与旅行者并肩作战。她放下了大小姐的身份，只为守护心中的信念。',
  },
  {
    id: 5,
    title: '雪鹤之章',
    chapter: '传说任务 · 第一幕',
    description: '传说任务揭开了绫华更柔软的一面——她也会迷路，也会对着甜品发呆，也会在樱花树下安静地想着心事。',
    quote: '偶尔……也想像普通人一样，自由自在地走在街上。',
  },
  {
    id: 6,
    title: '容彩祭',
    chapter: '活动剧情',
    description: '稻妻举办容彩祭，绫华难得放下公务，与旅行者一起逛祭典。金鱼灯、苹果糖、射击游戏——她笑得像个普通女孩。',
  },
  {
    id: 7,
    title: '穿越到现世',
    chapter: '……之后的故事',
    description: '某一天，绫华发现自己来到了一个完全陌生的世界——没有神之眼，没有社奉行，只有钢筋水泥的森林和一块叫"手机"的奇妙方块。但她没有慌张。因为在这个世界里，她遇到了你。',
    quote: '这里……就是你的世界啊。',
    highlight: true,
  },
];

export default function StoryPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <SnowfallCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-ice-900/40 via-transparent to-ice-900/60 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-16">
        {/* Header */}
        <motion.div
          className="pt-6 mb-8"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/" className="text-ice-400/50 hover:text-ice-300/70 text-sm transition-colors">
            ← 返回
          </Link>
        </motion.div>

        <motion.h1
          className="text-2xl md:text-3xl font-serif text-ice-100 text-center mb-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          剧情回溯
        </motion.h1>
        <motion.p
          className="text-ice-400/50 text-sm text-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          从稻妻到现世，她的故事从未停止
        </motion.p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-ice-400/0 via-ice-400/20 to-ice-400/0" />

          {TIMELINE.map((event, index) => (
            <TimelineNode key={event.id} event={event} index={index} isLeft={index % 2 === 0} />
          ))}
        </div>

        {/* Ending */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-ice-300/40 font-serif italic text-sm">
            &ldquo;故事还在继续……每天都是新的一页。&rdquo;
          </p>
          <Link href="/chat">
            <motion.button
              className="mt-6 px-6 py-2 rounded-full glass border-ice-300/15 text-ice-300/70 text-sm hover:text-ice-200 hover:border-ice-300/30 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              去和绫华聊聊 →
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function TimelineNode({ event, index, isLeft }: { event: TimelineEvent; index: number; isLeft: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div ref={ref} className={`relative flex items-start mb-12 md:mb-16 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
      {/* Dot */}
      <motion.div
        className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <div className={`w-3 h-3 rounded-full border-2 ${
          event.highlight
            ? 'bg-ice-400/60 border-ice-300/80 shadow-[0_0_12px_rgba(184,220,232,0.4)]'
            : 'bg-ice-700 border-ice-400/30'
        }`} />
      </motion.div>

      {/* Content card */}
      <motion.div
        className={`ml-10 md:ml-0 md:w-[calc(50%-2rem)] ${isLeft ? 'md:pr-0' : 'md:pl-0'}`}
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: 0.1 * index, duration: 0.5 }}
      >
        <div className={`glass p-5 ${event.highlight ? 'border-ice-400/20' : ''}`}>
          <p className="text-ice-400/50 text-xs mb-1">{event.chapter}</p>
          <h3 className="text-ice-100 font-serif text-base mb-2">{event.title}</h3>
          <p className="text-ice-300/70 text-sm leading-relaxed">{event.description}</p>
          {event.quote && (
            <p className="mt-3 text-ice-200/60 text-sm italic font-serif border-l-2 border-ice-400/20 pl-3">
              &ldquo;{event.quote}&rdquo;
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
