import { useEffect } from "react";

/**
 * Window scroll state, stored on a module singleton (not React state) so 3D
 * scenes can read it every frame inside `useFrame` without re-rendering.
 * `progress` is 0..1 across the full scrollable height; `y` is raw scrollY.
 * Mirrors the pattern in usePointer.ts.
 */
export const scroll = { progress: 0, y: 0 };

let listeners = 0;

function onScroll() {
  const y = window.scrollY || 0;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scroll.y = y;
  scroll.progress = Math.min(1, Math.max(0, y / max));
}

/** Attach the passive global scroll listener for as long as a scene is mounted. */
export function useScrollTracking() {
  useEffect(() => {
    if (listeners === 0) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      onScroll();
    }
    listeners += 1;
    return () => {
      listeners -= 1;
      if (listeners === 0) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
  }, []);
}
