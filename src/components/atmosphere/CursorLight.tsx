import { useEffect, useState } from 'react';

export function CursorLight() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduced || !fine) return;

    setEnabled(true);
    let rafId = 0;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      document.documentElement.style.setProperty('--cursor-x', `${currentX.toFixed(1)}px`);
      document.documentElement.style.setProperty('--cursor-y', `${currentY.toFixed(1)}px`);
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(620px circle at var(--cursor-x, 50vw) var(--cursor-y, 35vh), rgba(212, 175, 112, 0.09), rgba(168, 138, 89, 0.03) 38%, transparent 72%)',
      }}
    />
  );
}
