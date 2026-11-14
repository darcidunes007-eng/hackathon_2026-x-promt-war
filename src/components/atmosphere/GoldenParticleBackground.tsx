import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  depth: number;
  isOrb: boolean;
}

export function GoldenParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

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

    const count = Math.min(54, Math.max(24, Math.floor((width * height) / 28000)));
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const isOrb = i % 9 === 0;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.08 - Math.random() * 0.16,
        radius: isOrb ? 2.2 + Math.random() * 2.2 : 0.7 + Math.random() * 1.4,
        alpha: isOrb ? 0.22 + Math.random() * 0.18 : 0.18 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        depth: 0.4 + Math.random() * 0.8,
        isOrb,
      };
    });

    let pointerX = -9999;
    let pointerY = -9999;
    const onMouseMove = (e: MouseEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
    };
    const onMouseLeave = () => {
      pointerX = -9999;
      pointerY = -9999;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', resize);

    let rafId = 0;
    let t = 0;
    let lastTime = 0;

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (now - lastTime < 32) return;
      lastTime = now;

      t += 0.028;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx * p.depth * 1.6;
        p.y += p.vy * p.depth * 1.6;

        const dx = p.x - pointerX;
        const dy = p.y - pointerY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 22500 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (150 - dist) / 150;
          p.x += (dx / dist) * force * 0.85;
          p.y += (dy / dist) * force * 0.85;
        }

        if (p.y < -16) {
          p.y = height + 16;
          p.x = Math.random() * width;
        }
        if (p.x < -16) p.x = width + 16;
        if (p.x > width + 16) p.x = -16;

        const twinkle = 0.65 + 0.35 * Math.sin(t * 1.6 + p.phase);
        const alpha = p.alpha * twinkle;

        if (p.isOrb) {
          ctx.fillStyle = `rgba(212, 175, 112, ${alpha * 0.22})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(245, 215, 142, ${alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(245, 215, 142, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-85"
    />
  );
}
