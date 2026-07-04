'use client';

import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  r: number;
  speed: number;
  wind: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
}

export default function SnowfallCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let flakes: Snowflake[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initFlakes();
    };

    const initFlakes = () => {
      const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 15000));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.8 + Math.random() * 3,
        speed: 0.3 + Math.random() * 1.2,
        wind: (Math.random() - 0.5) * 0.4,
        opacity: 0.15 + Math.random() * 0.35,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.005 + Math.random() * 0.02,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const flake of flakes) {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(184, 220, 232, ${flake.opacity})`;
        ctx.fill();

        // Add a subtle glow for larger flakes
        if (flake.r > 2) {
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(184, 220, 232, ${flake.opacity * 0.15})`;
          ctx.fill();
        }
      }

      // Update positions
      for (const flake of flakes) {
        flake.y += flake.speed;
        flake.wobble += flake.wobbleSpeed;
        flake.x += Math.sin(flake.wobble) * 0.4 + flake.wind;

        if (flake.y > canvas.height + 10) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width + 10) flake.x = -10;
        if (flake.x < -10) flake.x = canvas.width + 10;
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.9 }}
    />
  );
}
