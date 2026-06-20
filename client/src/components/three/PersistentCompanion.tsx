import { Lazy3D } from "./Lazy3D";
import { HeroFallback } from "./fallbacks/HeroFallback";

const companionLoader = () => import("./scenes/ScrollCompanion");

/**
 * Persistent, fixed-viewport 3D brand element. Sits behind all page content
 * (-z-10), never receives pointer events (so content stays clickable), and
 * stays on-screen while the page scrolls — the scene itself drifts/morphs with
 * scroll progress. Capability-gated: mobile / reduced-motion / no-WebGL get the
 * static aurora poster instead of the canvas.
 */
export function PersistentCompanion() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Lazy3D className="absolute inset-0 opacity-70" loader={companionLoader} fallback={<HeroFallback />} />
    </div>
  );
}
