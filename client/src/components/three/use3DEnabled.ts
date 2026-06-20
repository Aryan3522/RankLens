import { useEffect, useState } from "react";

/** Cheap one-off WebGL availability probe (cached across calls). */
let webglOK: boolean | null = null;
function hasWebGL(): boolean {
  if (webglOK !== null) return webglOK;
  try {
    const canvas = document.createElement("canvas");
    webglOK = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    webglOK = false;
  }
  return webglOK;
}

/**
 * Gate for mounting real 3D. Returns true only on devices that can afford it:
 * no reduced-motion, viewport ≥ 768px, ≥ 4 logical cores, WebGL present, and
 * Data Saver off. Everything else gets a static fallback — which keeps mobile
 * and accessibility users out of the expensive `vendor-three` path entirely.
 */
export function use3DEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");

    const compute = () => {
      const cores = navigator.hardwareConcurrency ?? 8;
      const saveData = (navigator as any).connection?.saveData === true;
      setEnabled(
        !reduced.matches &&
          wide.matches &&
          cores >= 4 &&
          !saveData &&
          hasWebGL(),
      );
    };

    compute();
    reduced.addEventListener("change", compute);
    wide.addEventListener("change", compute);
    return () => {
      reduced.removeEventListener("change", compute);
      wide.removeEventListener("change", compute);
    };
  }, []);

  return enabled;
}
