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

export type DeviceTier = "high" | "mid" | "low" | "none";

/** Quality knobs the laptop stage reads off the resolved tier. */
export type TierConfig = {
  tier: DeviceTier;
  dpr: [number, number];
  shadows: boolean;
  /** drei <Environment> resolution; smaller = cheaper reflections. */
  envResolution: number;
  /** Run the idle/scene motion loop ("always") vs render once ("demand"). */
  frameloop: "always" | "demand";
};

const CONFIGS: Record<DeviceTier, TierConfig> = {
  high: { tier: "high", dpr: [1, 2], shadows: true, envResolution: 512, frameloop: "always" },
  mid: { tier: "mid", dpr: [1, 1.5], shadows: true, envResolution: 256, frameloop: "always" },
  low: { tier: "low", dpr: [1, 1.25], shadows: false, envResolution: 64, frameloop: "always" },
  // `none`: ONLY when WebGL is genuinely unavailable — the one case the real 3D
  // laptop physically can't render, so the static poster stands in.
  none: { tier: "none", dpr: [1, 1], shadows: false, envResolution: 64, frameloop: "demand" },
};

/**
 * Graded capability gate for the laptop centerpiece. Unlike `use3DEnabled`
 * (binary on/off used by every *other* scene), this ALWAYS renders the real 3D
 * laptop — it only grades the quality down. The single non-3D outcome is
 * `none`, reserved for true no-WebGL devices (the only case 3D can't render).
 * Reduced-motion does NOT drop to the poster: it keeps the 3D laptop (idle
 * motion is already minimal and the experience is scroll-driven), just at the
 * lighter `low` quality tier.
 */
export function useDeviceTier(): TierConfig {
  const [config, setConfig] = useState<TierConfig>(CONFIGS.low);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 1024px)");

    const compute = () => {
      if (!hasWebGL()) {
        setConfig(CONFIGS.none);
        return;
      }
      const cores = navigator.hardwareConcurrency ?? 8;
      const deviceMem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
      const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;

      // Weak/handheld/reduced-motion: keep the real 3D laptop but strip shadows + cap DPR.
      if (reduced.matches || saveData || cores <= 4 || deviceMem <= 4 || !wide.matches) {
        setConfig(CONFIGS.low);
        return;
      }
      // Capable: full reflections + shadows on large viewports, mid otherwise.
      setConfig(cores >= 8 ? CONFIGS.high : CONFIGS.mid);
    };

    compute();
    reduced.addEventListener("change", compute);
    wide.addEventListener("change", compute);
    return () => {
      reduced.removeEventListener("change", compute);
      wide.removeEventListener("change", compute);
    };
  }, []);

  return config;
}
