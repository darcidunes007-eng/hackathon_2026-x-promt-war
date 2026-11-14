import { useEffect, useRef, useState } from 'react';

interface TrailDot {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

type HoverMode = 'default' | 'button' | 'card' | 'link' | 'text';

export function CustomCursor() {
  const [active, setActive] = useState(false);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduced || !finePointer) {
      document.body.classList.remove('custom-cursor-active');
      return;
    }

    setActive(true);
    document.body.classList.add('custom-cursor-active');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let visible = false;
    let hoverMode: HoverMode = 'default';

    const trail: TrailDot[] = [];
    const ripples: Ripple[] = [];

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;

    const resize = () => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const detectHoverTarget = (target: EventTarget | null): HoverMode => {
      if (!(target instanceof Element)) return 'default';
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return 'text';
      if (target.closest('button, [role="button"], [data-cursor="button"]')) return 'button';
      if (target.closest('a[href], [data-cursor="link"]')) return 'link';
      if (target.closest('[data-cursor="card"]')) return 'card';
      return 'default';
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      visible = true;
      hoverMode = detectHoverTarget(e.target);

      if (trail.length < 18) {
        trail.push({
          x: mouseX,
          y: mouseY,
          alpha: 0.34,
          size: hoverMode === 'button' ? 2.4 : 1.7,
        });
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 6,
        alpha: 0.55,
      });
    };

    const onMouseLeave = () => {
      visible = false;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', resize);

    let rafId = 0;

    const render = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      if (dotRef.current) {
        const dotScale = hoverMode === 'button' ? 1.45 : hoverMode === 'text' ? 0.65 : 1;
        dotRef.current.style.opacity = visible ? (hoverMode === 'text' ? '0.45' : '1') : '0';
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${dotScale})`;
      }

      if (ringRef.current) {
        let scale = 1;
        let borderColor = 'rgba(212, 175, 112, 0.55)';
        let bg = 'transparent';
        let glow = '0 0 14px rgba(212, 175, 112, 0.16)';

        if (hoverMode === 'button') {
          scale = 1.65;
          borderColor = 'rgba(245, 215, 142, 0.9)';
          bg = 'rgba(212, 175, 112, 0.08)';
          glow = '0 0 22px rgba(245, 215, 142, 0.28)';
        } else if (hoverMode === 'card') {
          scale = 1.35;
          borderColor = 'rgba(212, 175, 112, 0.72)';
          bg = 'rgba(212, 175, 112, 0.04)';
        } else if (hoverMode === 'link') {
          scale = 1.25;
          borderColor = 'rgba(245, 215, 142, 0.85)';
        } else if (hoverMode === 'text') {
          scale = 0.55;
          borderColor = 'rgba(212, 175, 112, 0.28)';
        }

        ringRef.current.style.opacity = visible ? '1' : '0';
        ringRef.current.style.borderColor = borderColor;
        ringRef.current.style.backgroundColor = bg;
        ringRef.current.style.boxShadow = glow;
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      }

      if (ctx && (trail.length > 0 || ripples.length > 0)) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = trail.length - 1; i >= 0; i -= 1) {
          const item = trail[i];
          item.alpha -= 0.025;
          if (item.alpha <= 0) {
            trail.splice(i, 1);
            continue;
          }
          ctx.fillStyle = `rgba(212, 175, 112, ${item.alpha})`;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = ripples.length - 1; i >= 0; i -= 1) {
          const r = ripples[i];
          r.radius += 1.9;
          r.alpha -= 0.026;
          if (r.alpha <= 0) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(245, 215, 142, ${r.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (trail.length === 0 && ripples.length === 0) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 h-8 w-8 rounded-full border transition-[background-color,border-color,box-shadow,opacity] duration-150 ease-out"
        style={{ opacity: 0 }}
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 h-1.5 w-1.5 rounded-full bg-[#F5D78E] shadow-[0_0_8px_rgba(245,215,142,0.8)] transition-opacity duration-150"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
