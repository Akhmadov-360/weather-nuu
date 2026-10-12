import { useEffect, useRef } from 'react';

import { AtmosphereEngine, type EngineLayer } from './engine/engine';
import { trackSurfaces } from './engine/measure-surfaces';

type AtmosphereStageProps = {
  layers: EngineLayer[];
  budget: number;
  dark: boolean;
  lights: boolean;
  /** Called once with the average frame time of each two-second window; the caller's governor decides. */
  onFrame?: (frameMs: number) => void;
};

/**
 * The full-window canvas of the scene (the "full" level only; it is loaded
 * lazily so the other levels never download it). It ignores the pointer, is
 * hidden from assistive technology and stops while the tab is hidden.
 */
export default function AtmosphereStage({ layers, budget, dark, lights, onFrame }: AtmosphereStageProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decorRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AtmosphereEngine | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const canvas = canvasRef.current;
    const decor = decorRef.current;
    if (!canvas || !decor) return;
    const surfaces = trackSurfaces();
    const engine = new AtmosphereEngine(canvas, decor, {
      budget,
      dark,
      lights,
      getSurfaces: surfaces.get,
      onFrame: (ms) => onFrameRef.current?.(ms),
    });
    engineRef.current = engine;
    engine.setLayers(layers);
    if (!document.hidden) engine.start();
    const onVisibility = () => (document.hidden ? engine.stop() : engine.start());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      surfaces.dispose();
      engine.dispose();
      engineRef.current = null;
    };
    // The engine is created once; later changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setOptions({ budget, dark, lights });
  }, [budget, dark, lights]);

  useEffect(() => {
    engineRef.current?.setLayers(layers);
  }, [layers]);

  return (
    <>
      {/* In the document: scrolls natively with the cards, so what hangs on their edges never lags. */}
      <canvas ref={decorRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden />
      {/* Fixed to the window: falling particles, sky effects, lightning. */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden />
    </>
  );
}
