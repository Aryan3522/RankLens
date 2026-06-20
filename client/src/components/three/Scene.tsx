import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { usePointerTracking } from "./usePointer";

type SceneProps = {
  children: ReactNode;
  className?: string;
  /** "always" for continuous motion, "demand" for static scenes that
   *  invalidate() on input. Defaults to "always". */
  frameloop?: "always" | "demand";
  /** Allow the canvas to receive pointer events (default off, so content
   *  layered above the hero canvas stays clickable). */
  interactive?: boolean;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  /** Device-pixel-ratio cap. Raise for crisper hero models (e.g. [1, 2]). */
  dpr?: [number, number];
};

/**
 * Single shared <Canvas> wrapper. Configures DPR cap + adaptive throttling +
 * preload + the global pointer listener in one place, and pauses the render
 * loop while the tab is hidden so an animated scene never burns battery in the
 * background. `alpha: true` lets the CSS aurora/grid show through.
 */
export function Scene({
  children,
  className,
  frameloop = "always",
  interactive = false,
  cameraPosition = [0, 0, 6],
  cameraFov = 50,
  dpr = [1, 1.75],
}: SceneProps) {
  usePointerTracking();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      className={className}
      style={{ pointerEvents: interactive ? "auto" : "none" }}
      frameloop={visible ? frameloop : "never"}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: cameraPosition, fov: cameraFov }}
    >
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </Canvas>
  );
}
