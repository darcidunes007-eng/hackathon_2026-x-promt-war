import { useEffect, useRef } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  swayPhase: number;
  opacity: number;
}

export function FloatingPetals({ density = 'subtle' }: { density?: 'subtle' | 'editorial' }) {
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

    const count = density === 'editorial' ? 14 : 9;
    const petals: Petal[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 7 + Math.random() * 8,
      vx: 0.1 + Math.random() * 0.18,
      vy: 0.18 + Math.random() * 0.24,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.008,
      swayPhase: Math.random() * Math.PI * 2,
      opacity: 0.08 + Math.random() * 0.12,
    }));

    window.addEventListener('resize', resize);
    let rafId = 0;
    let t = 0;
    let lastTime = 0;

    const drawPetal = (p: Petal) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      const grad = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
      grad.addColorStop(0, `rgba(245, 215, 142, ${p.opacity * 1.15})`);
      grad.addColorStop(0.55, `rgba(212, 175, 112, ${p.opacity * 0.75})`);
      grad.addColorStop(1, `rgba(168, 138, 89, ${p.opacity * 0.2})`);

      ctx.fillStyle = grad;
      ctx.strokeStyle = `rgba(245, 215, 142, ${p.opacity * 0.55})`;
      ctx.lineWidth = 0.6;

      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.75, -p.size * 0.55, p.size * 0.75, p.size * 0.55, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.75, p.size * 0.55, -p.size * 0.75, -p.size * 0.55, 0, -p.size);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (now - lastTime < 32) return;
      lastTime = now;

      t += 0.022;
      ctx.clearRect(0, 0, width, height);

      for (const p of petals) {
        p.x += (p.vx + Math.sin(t + p.swayPhase) * 0.18) * 1.5;
        p.y += p.vy * 1.5;
        p.rotation += p.vRot * 1.5;

        if (p.y > height + 24) {
          p.y = -24;
          p.x = Math.random() * width;
        }
        if (p.x > width + 24) p.x = -24;
        if (p.x < -24) p.x = width + 24;

        drawPetal(p);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
