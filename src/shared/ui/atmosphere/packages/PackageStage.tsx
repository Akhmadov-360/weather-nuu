import { useEffect, useMemo, useState } from 'react';
import { FallingLeaves } from 'falling-leaves/react';
import { Rain } from 'react-rainfall';
import 'react-rainfall/dist/style.css';
import Snowfall from 'react-snowfall';

import type { PackagePlan } from './plan';

type PackageStageProps = {
  plan: PackagePlan;
  dark: boolean;
  /** Called with the average frame time of each two-second window; the caller's governor decides. */
  onFrame?: (frameMs: number) => void;
};

/**
 * The falling layers of the scene drawn by ready-made packages: leaves and petals (falling-leaves), snow
 * (react-snowfall), rain (react-rainfall). It sits behind the cards, so a piece never crosses the text, and
 * ignores the pointer. Loaded lazily with the "full" level only; it is not mounted for "calm" and "off", which
 * is also how `prefers-reduced-motion` keeps it away.
 */

const PETAL_SVG = (fill: string, tip: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${tip}"/></linearGradient></defs><path d="M32 60C48 44 56 24 38 6 35 3 33 6 32 8 31 6 29 3 26 6 8 24 16 44 32 60Z" fill="url(#g)"/></svg>`;

const PETALS = [PETAL_SVG('#FF9DB4', '#FFE3EA'), PETAL_SVG('#FFB3C4', '#FFEFF3'), PETAL_SVG('#FF8FAA', '#FFD6E0'), PETAL_SVG('#FFC2D0', '#FFF4F7')];

function loadImages(svgs: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    svgs.map(
      (svg) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }),
    ),
  );
}

function usePetalImages(needed: boolean): HTMLImageElement[] {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    if (!needed || images.length > 0) return;
    let alive = true;
    loadImages(PETALS)
      .then((loaded) => alive && setImages(loaded))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [needed, images.length]);
  return images;
}

/** Average frame time in two-second windows, measured here because the packages do not report it. */
function useFrameSampler(onFrame: ((frameMs: number) => void) | undefined): void {
  useEffect(() => {
    if (!onFrame) return;
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let frames = 0;
    const tick = (now: number) => {
      if (last > 0) {
        const dt = now - last;
        // A frame after a hidden tab or a long stall says nothing about the scene.
        if (dt < 250) {
          elapsed += dt;
          frames++;
        }
        if (elapsed >= 2000) {
          onFrame(elapsed / frames);
          elapsed = 0;
          frames = 0;
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onFrame]);
}

export default function PackageStage({ plan, dark, onFrame }: PackageStageProps): React.JSX.Element {
  const petalImages = usePetalImages(Boolean(plan.petals));
  const leafShapes = useMemo(() => ['maple', 'ginkgo', 'oak', 'birch'] as const, []);
  useFrameSampler(onFrame);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5]" aria-hidden data-engine="packages">
      {plan.leaves ? <FallingLeaves count={plan.leaves.count} wind={plan.leaves.wind} shapes={[...leafShapes]} opacity={0.92} zIndex={0} respectReducedMotion /> : null}
      {plan.petals && petalImages.length > 0 ? (
        <FallingLeaves count={plan.petals.count} size={[8, 16]} speed={[0.5, 1.2]} wind={plan.petals.wind} images={petalImages} opacity={0.92} zIndex={0} respectReducedMotion />
      ) : null}
      {plan.snow ? (
        <Snowfall
          snowflakeCount={plan.snow.count}
          radius={[0.6, 3.2]}
          speed={[0.4, 1.6]}
          wind={plan.snow.wind}
          rotationSpeed={[-0.5, 0.5]}
          enable3DRotation
          color={dark ? '#EAF2FF' : '#8FB0DE'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      ) : null}
      {plan.rain ? (
        <Rain
          renderer="canvas"
          profile="steady-rain"
          quality="high"
          numDrops={plan.rain.count}
          maxDrops={plan.rain.count}
          intensity={plan.rain.intensity}
          angle={plan.rain.angle}
          depth
          respectReducedMotion
          dropletColor={dark ? 'rgb(150, 190, 255)' : 'rgb(80, 120, 195)'}
        />
      ) : null}
    </div>
  );
}
