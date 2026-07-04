import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '神里绫华 · 在现世等你',
  description: '她穿越到了你的世界。不止是一个粉丝站——这是她在现世的家。',
  icons: {
    icon: '/api/random-image?file=绫华美图1.webp',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
