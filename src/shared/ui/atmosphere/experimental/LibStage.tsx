import { useEffect, useMemo, useState } from 'react';
import { FallingLeaves } from 'falling-leaves/react';
import { Rain } from 'react-rainfall';
import 'react-rainfall/dist/style.css';
import Snowfall from 'react-snowfall';

import type { EngineLayer } from '../engine/engine';

/**
 * EXPERIMENT (branch experiment/atmosphere-libs, development only, `?engine=lib`): the falling layers of the
 * scene drawn by ready-made packages instead of our engine, to compare how they look and what they cost.
 * It draws only the four layers that were asked about: leaves and petals (falling-leaves), snow
 * (react-snowfall) and rain (react-rainfall). It has no landing on cards, no header shower, no sky.
 */

const PETAL_SVG = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient></defs><path d="M32 60C48 44 56 24 38 6 35 3 33 6 32 8 31 6 29 3 26 6 8 24 16 44 32 60Z" fill="url(#g)"/></svg>`;

function useImages(svgs: string[]): HTMLImageElement[] {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all(
      svgs.map(
        (svg) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          }),
      ),
    ).then((loaded) => alive && setImages(loaded));
    return () => {
      alive = false;
    };
    // The petal set never changes during the experiment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return images;
}

export default function LibStage({ layers, dark }: { layers: EngineLayer[]; dark: boolean }): React.JSX.Element {
  const leaves = layers.find((l) => l.kind === 'leaves');
  const petals = layers.find((l) => l.kind === 'petals');
  const snow = layers.find((l) => l.kind === 'snow');
  const rain = layers.find((l) => l.kind === 'rain');
  const wind = layers[0]?.windX ?? 0;
  const petalImages = useImages(useMemo(() => ['#FFB7C5', '#FFC9D4', '#FFA8BA', '#FFD6DE'].map(PETAL_SVG), []));

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden data-engine="lib">
      {leaves ? <FallingLeaves count={Math.round(leaves.intensity * 90)} wind={[wind / 60, wind / 25 + 0.5]} zIndex={40} /> : null}
      {petals && petalImages.length > 0 ? (
        <FallingLeaves count={Math.round(petals.intensity * 90)} size={[8, 16]} speed={[0.5, 1.2]} wind={[wind / 60, wind / 25 + 0.4]} images={petalImages} zIndex={40} />
      ) : null}
      {snow ? (
        <Snowfall
          snowflakeCount={Math.round(snow.intensity * 400)}
          radius={[0.6, 3.2]}
          speed={[0.4, 1.6]}
          wind={[wind / 60 - 0.4, wind / 25 + 0.6]}
          rotationSpeed={[-0.5, 0.5]}
          enable3DRotation
          color={dark ? '#EAF2FF' : '#FFFFFF'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      ) : null}
      {rain ? (
        <Rain
          renderer="canvas"
          profile="steady-rain"
          intensity={Math.min(1, rain.intensity + 0.2)}
          angle={Math.max(-20, Math.min(20, wind / 3))}
          depth
          dropletColor={dark ? 'rgb(150, 190, 255)' : 'rgb(90, 130, 200)'}
        />
      ) : null}
    </div>
  );
}
