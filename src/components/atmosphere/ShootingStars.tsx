import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
}

export function ShootingStars() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const stars: Star[] = [];
    let nextSpawn = 160;

    const spawnStar = () => {
      const startX = width * (0.15 + Math.random() * 0.75);
      const startY = height * (0.04 + Math.random() * 0.32);
      const speed = 7 + Math.random() * 4;
      const angle = Math.PI * (0.72 + Math.random() * 0.14);
      stars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 75 + Math.random() * 55,
        life: 0,
        maxLife: 46 + Math.floor(Math.random() * 24),
      });
    };

    window.addEventListener('resize', resize);
    let rafId = 0;
    let lastTime = 0;
    let wasDirty = false;

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (now - lastTime < 33) return;
      lastTime = now;

      nextSpawn -= 1;
      if (nextSpawn <= 0 && stars.length < 2) {
        spawnStar();
        nextSpawn = 140 + Math.floor(Math.random() * 180);
      }

      if (stars.length === 0) {
        if (wasDirty) {
          ctx.clearRect(0, 0, width, height);
          wasDirty = false;
        }
        return;
      }

      wasDirty = true;
      ctx.clearRect(0, 0, width, height);

      for (let i = stars.length - 1; i >= 0; i -= 1) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;

        const progress = s.life / s.maxLife;
        const opacity = Math.sin(progress * Math.PI) * 0.62;

        const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length;
        const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length;

        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(245, 215, 142, ${opacity})`);
        grad.addColorStop(0.35, `rgba(212, 175, 112, ${opacity * 0.45})`);
        grad.addColorStop(1, 'rgba(212, 175, 112, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.fillStyle = `rgba(247, 243, 234, ${opacity * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.3, 0, Math.PI * 2);
        ctx.fill();

        if (s.life >= s.maxLife) {
          stars.splice(i, 1);
        }
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
