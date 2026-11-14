import { CursorLight } from './CursorLight';
import { CustomCursor } from './CustomCursor';
import { FloatingPetals } from './FloatingPetals';
import { GoldenParticleBackground } from './GoldenParticleBackground';
import { ShootingStars } from './ShootingStars';

export function MidnightAtmosphere({
  petalDensity = 'subtle',
}: {
  petalDensity?: 'subtle' | 'editorial';
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 15% 10%, rgba(168, 138, 89, 0.08), transparent 60%), radial-gradient(ellipse 65% 50% at 88% 82%, rgba(212, 175, 112, 0.06), transparent 60%), linear-gradient(180deg, #090A0F 0%, #0D0E15 55%, #090A0F 100%)',
        }}
      />
      <CursorLight />
      <GoldenParticleBackground />
      <ShootingStars />
      <FloatingPetals density={petalDensity} />
      <CustomCursor />
    </>
  );
}
