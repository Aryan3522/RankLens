import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { pointer } from "../usePointer";
import { C, engineColor } from "../palette";

export type UniverseEngine = { name: string; readiness: number };

/** Marketing default — overridden by real `aiEngineReadiness` in the app. */
const DEFAULT_ENGINES: UniverseEngine[] = [
  { name: "ChatGPT", readiness: 82 },
  { name: "Gemini", readiness: 74 },
  { name: "Claude", readiness: 88 },
  { name: "Perplexity", readiness: 69 },
  { name: "Copilot", readiness: 77 },
];

const PARTICLES_PER_ENGINE = 8;

type Planet = {
  name: string;
  color: THREE.Color;
  /** Local orbit position. Higher readiness → closer + bigger. */
  pos: THREE.Vector3;
  size: number;
  orbitRadius: number;
  tilt: number;
};

/**
 * "AI Visibility Universe" — a central content core with one orbiting planet
 * per answer engine, sized & pulled inward by that engine's readiness, plus
 * animated citation streams flowing core → planet at a density that tracks
 * readiness. Reads the page like: which engines can already "see" you, and how
 * strongly your content reaches each one.
 */
function UniverseContent({ engines }: { engines: UniverseEngine[] }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const streamRef = useRef<THREE.Points>(null);

  const planets = useMemo<Planet[]>(() => {
    const n = Math.max(engines.length, 1);
    return engines.map((e, i) => {
      const readiness = Math.min(Math.max(e.readiness, 0), 100);
      const angle = (i / n) * Math.PI * 2;
      const tilt = -0.35 + (i % 3) * 0.32; // stagger the orbital planes
      const orbitRadius = 3.4 - (readiness / 100) * 1.3; // stronger engines orbit closer
      const pos = new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle) * orbitRadius * Math.sin(tilt),
        Math.sin(angle) * orbitRadius * Math.cos(tilt),
      );
      return {
        name: e.name,
        color: new THREE.Color(engineColor(e.name)),
        pos,
        size: 0.18 + (readiness / 100) * 0.24,
        orbitRadius,
        tilt,
      };
    });
  }, [engines]);

  // Citation-stream particles: each carries a phase + speed (∝ readiness).
  const stream = useMemo(() => {
    const count = planets.length * PARTICLES_PER_ENGINE;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    let k = 0;
    planets.forEach((p, pi) => {
      const r = Math.min(Math.max(engines[pi].readiness, 0), 100) / 100;
      for (let j = 0; j < PARTICLES_PER_ENGINE; j++) {
        colors.set([p.color.r, p.color.g, p.color.b], k * 3);
        phase[k] = j / PARTICLES_PER_ENGINE;
        speed[k] = 0.25 + r * 0.55; // denser flow = faster cycle
        k++;
      }
    });
    return { count, positions, colors, phase, speed };
  }, [planets, engines]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      easing.damp(group.current.rotation, "x", pointer.ny * 0.25, 0.5, delta);
      easing.damp(group.current.rotation, "y", pointer.nx * 0.4 + t * 0.06, 0.5, delta);
    }
    if (core.current) {
      core.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    }
    // Stream particles travel from core (0,0,0) outward to their planet.
    if (streamRef.current) {
      const arr = stream.positions;
      let k = 0;
      planets.forEach((p) => {
        for (let j = 0; j < PARTICLES_PER_ENGINE; j++) {
          const f = (t * stream.speed[k] + stream.phase[k]) % 1;
          tmp.copy(p.pos).multiplyScalar(f);
          arr.set([tmp.x, tmp.y, tmp.z], k * 3);
          k++;
        }
      });
      const attr = streamRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  const orbitLines = useMemo(() => {
    const seg: number[] = [];
    for (const p of planets) {
      seg.push(0, 0, 0, p.pos.x, p.pos.y, p.pos.z);
    }
    return new Float32Array(seg);
  }, [planets]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 5]} intensity={28} color={C.blue} />
      <pointLight position={[4, 4, -3]} intensity={16} color={C.purple} />

      <group ref={group}>
        {/* faint core → planet links */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[orbitLines, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={C.blue} transparent opacity={0.18} depthWrite={false} />
        </lineSegments>

        {/* citation streams */}
        <points ref={streamRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stream.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[stream.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.11}
            transparent
            opacity={0.95}
            vertexColors
            sizeAttenuation
            depthWrite={false}
          />
        </points>

        {/* your-content core */}
        <mesh ref={core}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial
            color={C.cyan}
            emissive={C.blue}
            emissiveIntensity={1.5}
            wireframe
            toneMapped={false}
          />
        </mesh>

        {/* engine planets */}
        {planets.map((p) => (
          <Float key={p.name} speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh position={p.pos}>
              <sphereGeometry args={[p.size, 28, 28]} />
              <meshStandardMaterial
                color={p.color}
                emissive={p.color}
                emissiveIntensity={1.8}
                toneMapped={false}
              />
            </mesh>
          </Float>
        ))}
      </group>
    </>
  );
}

/** Canvas-wrapped universe loaded lazily by `Lazy3D`. */
export default function AIVisibilityUniverse({ engines }: { engines?: UniverseEngine[] }) {
  return (
    <Scene frameloop="always" cameraPosition={[0, 0, 8]} cameraFov={48}>
      <UniverseContent engines={engines?.length ? engines : DEFAULT_ENGINES} />
    </Scene>
  );
}
