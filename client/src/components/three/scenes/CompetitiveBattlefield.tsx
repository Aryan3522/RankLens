import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { pointer } from "../usePointer";
import { C } from "../palette";

export type BattleRow = { metric: string; you: number; competitor: number };

const DEFAULT_ROWS: BattleRow[] = [
  { metric: "AI Citation Readiness", you: 68, competitor: 41 },
  { metric: "Structured Data", you: 92, competitor: 55 },
  { metric: "E-E-A-T Signals", you: 74, competitor: 60 },
  { metric: "Core Web Vitals", you: 88, competitor: 72 },
  { metric: "Entity Coverage", you: 63, competitor: 38 },
];

const MAX_H = 2.6; // tallest pillar at score 100
const SLOT = 1.7; // x-spacing between metrics

/**
 * A single pillar whose base is pinned to the floor (y=0). The group pivots at
 * the base, so scaling y grows the bar upward; it eases from 0→1 after its
 * staggered `delay` for a "rise into place" reveal.
 */
function Pillar({
  x,
  height,
  color,
  emissive,
  emissiveIntensity,
  delay,
}: {
  x: number;
  height: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  delay: number;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!g.current) return;
    const target = state.clock.elapsedTime > delay ? 1 : 0.001;
    easing.damp(g.current.scale, "y", target, 0.45, delta);
  });
  return (
    <group ref={g} position={[x, 0, 0]} scale={[1, 0.001, 1]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.5, height, 0.5]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Floating marker above the taller pair, colored by who leads. */
function GapMarker({ x, y, lead }: { x: number; y: number; lead: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = y + 0.25 + Math.sin(state.clock.elapsedTime * 2 + x) * 0.08;
  });
  return (
    <mesh ref={ref} position={[x, y + 0.25, 0]}>
      <octahedronGeometry args={[0.12, 0]} />
      <meshStandardMaterial
        color={lead ? C.success : C.error}
        emissive={lead ? C.success : C.error}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
}

function BattlefieldContent({ rows }: { rows: BattleRow[] }) {
  const group = useRef<THREE.Group>(null);
  const n = rows.length;
  const startX = -((n - 1) * SLOT) / 2;

  const gridColor = useMemo(() => new THREE.Color(C.blue), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    easing.damp(group.current.rotation, "y", pointer.nx * 0.35 + Math.sin(t * 0.15) * 0.18, 0.5, delta);
    easing.damp(group.current.rotation, "x", -0.12 + pointer.ny * 0.12, 0.5, delta);
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 6, 5]} intensity={30} color={C.blue} />
      <pointLight position={[-4, 3, -2]} intensity={18} color={C.purple} />

      {/* lift the arena so it centers on the origin */}
      <group ref={group} position={[0, -1.1, 0]}>
        {/* grid floor */}
        <gridHelper
          args={[12, 16, gridColor, gridColor]}
          position={[0, 0, 0]}
          material-transparent
          material-opacity={0.18}
        />

        {rows.map((row, i) => {
          const x = startX + i * SLOT;
          const youH = (Math.min(Math.max(row.you, 0), 100) / 100) * MAX_H;
          const compH = (Math.min(Math.max(row.competitor, 0), 100) / 100) * MAX_H;
          const lead = row.you >= row.competitor;
          return (
            <group key={row.metric}>
              {/* you — electric blue, lit */}
              <Pillar
                x={x - 0.35}
                height={youH}
                color={C.blue}
                emissive={C.blue}
                emissiveIntensity={0.9}
                delay={0.15 + i * 0.12}
              />
              {/* competitor — muted graphite */}
              <Pillar
                x={x + 0.35}
                height={compH}
                color="#3a4452"
                emissive="#1b2230"
                emissiveIntensity={0.2}
                delay={0.25 + i * 0.12}
              />
              <GapMarker x={x - 0.35} y={youH} lead={lead} />
            </group>
          );
        })}
      </group>
    </>
  );
}

/** Canvas-wrapped battlefield loaded lazily by `Lazy3D`. */
export default function CompetitiveBattlefield({ rows }: { rows?: BattleRow[] }) {
  return (
    <Scene frameloop="always" cameraPosition={[0, 1.3, 8]} cameraFov={45}>
      <BattlefieldContent rows={rows?.length ? rows : DEFAULT_ROWS} />
    </Scene>
  );
}
