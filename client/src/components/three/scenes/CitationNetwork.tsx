import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { pointer } from "../usePointer";
import { C, engineColor } from "../palette";

const ENGINES = [
  { label: "ChatGPT", angle: 0 },
  { label: "Gemini", angle: 72 },
  { label: "Claude", angle: 144 },
  { label: "Perplexity", angle: 216 },
  { label: "Copilot", angle: 288 },
].map((e) => ({ ...e, color: engineColor(e.label) }));
const RADIUS = 2.8;

function CitationNetworkContent() {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);

  const engines = useMemo(
    () =>
      ENGINES.map((e) => {
        const rad = (e.angle * Math.PI) / 180;
        return { ...e, pos: new THREE.Vector3(Math.cos(rad) * RADIUS, Math.sin(rad) * RADIUS, 0) };
      }),
    [],
  );

  const linePositions = useMemo(() => {
    const seg: number[] = [];
    for (const e of engines) seg.push(0, 0, 0, e.pos.x, e.pos.y, e.pos.z);
    return new Float32Array(seg);
  }, [engines]);

  useFrame((state, delta) => {
    if (group.current) {
      easing.damp(group.current.rotation, "y", pointer.nx * 0.35, 0.5, delta);
      easing.damp(group.current.rotation, "x", pointer.ny * 0.25, 0.5, delta);
      group.current.rotation.z = state.clock.elapsedTime * 0.04;
    }
    if (core.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
      core.current.scale.setScalar(s);
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 0, 4]} intensity={30} color={C.blue} />

      <group ref={group}>
        {/* radiating citation links */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={C.blue} transparent opacity={0.35} depthWrite={false} />
        </lineSegments>

        {/* your-content core */}
        <mesh ref={core}>
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial
            color={C.cyan}
            emissive={C.blue}
            emissiveIntensity={1.4}
            wireframe
            toneMapped={false}
          />
        </mesh>

        {/* engine nodes */}
        {engines.map((e) => (
          <Float key={e.label} speed={2.5} rotationIntensity={0.3} floatIntensity={0.5}>
            <mesh position={e.pos}>
              <sphereGeometry args={[0.32, 24, 24]} />
              <meshStandardMaterial
                color={e.color}
                emissive={e.color}
                emissiveIntensity={2}
                toneMapped={false}
              />
            </mesh>
          </Float>
        ))}
      </group>
    </>
  );
}

/** Canvas-wrapped citation-network scene loaded lazily by `Lazy3D`. */
export default function CitationNetwork() {
  return (
    <Scene frameloop="always" cameraPosition={[0, 0, 8]} cameraFov={48}>
      <CitationNetworkContent />
    </Scene>
  );
}
