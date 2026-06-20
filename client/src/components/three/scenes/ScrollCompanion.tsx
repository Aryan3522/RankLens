import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { pointer } from "../usePointer";
import { useScrollTracking, scroll } from "../useScroll";
import { C } from "../palette";

const NODE_COUNT = 54;

/** Keyword nodes loosely clustered on a sphere shell (Fibonacci distribution). */
function makeNodes(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push(
      new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(
        radius * (0.85 + (i % 5) * 0.04),
      ),
    );
  }
  return pts;
}

/**
 * Persistent brand "SEO intelligence" element: a slowly-rotating keyword
 * network around a wireframe core. It drifts across the viewport as the page
 * scrolls (always staying framed), shifts accent emphasis between sections,
 * and parallaxes toward the pointer. Rendered as a fixed, subtle backdrop.
 */
function CompanionContent() {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const keyLight = useRef<THREE.PointLight>(null);

  const { nodePositions, linePositions } = useMemo(() => {
    const nodes = makeNodes(NODE_COUNT, 2.4);
    const np = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => np.set([n.x, n.y, n.z], i * 3));
    // Connect each node to its 2 nearest neighbors → sparse web.
    const seg: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const near = nodes
        .map((n, j) => ({ j, d: nodes[i].distanceTo(n) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of near) {
        seg.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      }
    }
    return { nodePositions: np, linePositions: new Float32Array(seg) };
  }, []);

  const blue = useMemo(() => new THREE.Color(C.blue), []);
  const purple = useMemo(() => new THREE.Color(C.purple), []);
  const cyan = useMemo(() => new THREE.Color(C.cyan), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const p = scroll.progress;
    const t = state.clock.elapsedTime;
    if (group.current) {
      // Drift across the viewport but stay framed: gentle lateral sweep + sink.
      const targetX = Math.sin(p * Math.PI) * 1.6 + pointer.nx * 0.5;
      const targetY = -p * 1.4 + pointer.ny * 0.4;
      easing.damp3(group.current.position, [targetX, targetY, 0], 0.5, delta);
      easing.damp(group.current.rotation, "y", pointer.nx * 0.4 + t * 0.05 + p * Math.PI, 0.5, delta);
      easing.damp(group.current.rotation, "x", pointer.ny * 0.25 + p * 0.5, 0.5, delta);
    }
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.05);
    if (keyLight.current) {
      // Blend accent emphasis blue → purple → cyan across the scroll.
      if (p < 0.5) tmpColor.copy(blue).lerp(purple, p * 2);
      else tmpColor.copy(purple).lerp(cyan, (p - 0.5) * 2);
      keyLight.current.color.copy(tmpColor);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight ref={keyLight} position={[5, 5, 6]} intensity={36} color={C.blue} />
      <pointLight position={[-6, -3, 2]} intensity={18} color={C.purple} />

      <group ref={group}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.07} color={C.node} transparent opacity={0.85} sizeAttenuation depthWrite={false} />
        </points>

        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={C.blue} transparent opacity={0.16} depthWrite={false} />
        </lineSegments>

        <mesh ref={core}>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshStandardMaterial color={C.cyan} emissive={C.blue} emissiveIntensity={1.2} wireframe toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

/** Canvas-wrapped companion loaded lazily by `Lazy3D`. */
export default function ScrollCompanion() {
  useScrollTracking();
  return (
    <Scene frameloop="always" cameraPosition={[0, 0, 7]} cameraFov={52}>
      <CompanionContent />
    </Scene>
  );
}
