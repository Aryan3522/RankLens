import { useEffect } from "react";

/**
 * Window-level pointer state, normalized to -1..1 with origin at center.
 * Stored on a module singleton (not React state) so 3D scenes can read it
 * every frame inside `useFrame` without triggering re-renders.
 */
export const pointer = { nx: 0, ny: 0 };

let listeners = 0;

function onMove(e: PointerEvent) {
  pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
}

/** Attach the passive global pointer listener for as long as a scene is mounted. */
export function usePointerTracking() {
  useEffect(() => {
    if (listeners === 0) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    listeners += 1;
    return () => {
      listeners -= 1;
      if (listeners === 0) window.removeEventListener("pointermove", onMove);
    };
  }, []);
}
