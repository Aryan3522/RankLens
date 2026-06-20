import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { use3DEnabled } from "./use3DEnabled";

type Lazy3DProps = {
  /** Dynamic import of the scene module. Only ever called on capable devices,
   *  and only once the wrapper scrolls near the viewport — so `vendor-three`
   *  stays off the critical path. */
  loader: () => Promise<{ default: ComponentType<any> }>;
  /** Static poster shown on incapable devices, before load, and while the
   *  chunk streams in. Should match the 3D scene's layout for zero CLS. */
  fallback: ReactNode;
  className?: string;
  /** How early (relative to viewport) to begin loading. */
  rootMargin?: string;
  /** Props forwarded to the loaded scene component. */
  sceneProps?: Record<string, unknown>;
  /** Override the automatic capability gate (e.g. render a static 3D scene
   *  even under reduced-motion, where the scene itself disables animation). */
  enabled?: boolean;
};

/**
 * Capability-gated, intersection-deferred 3D mount. If `use3DEnabled` is false
 * we render the fallback and never import three at all. Otherwise we wait for
 * the element to approach the viewport, then lazy-import the scene behind the
 * fallback (which doubles as the Suspense fallback).
 */
export function Lazy3D({ loader, fallback, className, rootMargin = "200px", sceneProps, enabled: enabledOverride }: Lazy3DProps) {
  const auto = use3DEnabled();
  const enabled = enabledOverride ?? auto;
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  // Create the lazy component once per loader identity.
  const SceneComp = useMemo(() => lazy(loader), [loader]);

  useEffect(() => {
    if (!enabled || near) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, near, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {enabled && near ? (
        <Suspense fallback={fallback}>
          <SceneComp {...sceneProps} />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
