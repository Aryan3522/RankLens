import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { pointer } from "../usePointer";
import { C, engineColor } from "../palette";

const NODE_COUNT = 48;
/** 4 loose "search clusters" the keyword nodes group around. */
const CLUSTER_CENTERS = [
  new THREE.Vector3(1.7, 0.9, 0.6),
  new THREE.Vector3(-1.9, 0.4, -0.7),
  new THREE.Vector3(0.5, -1.8, 0.9),
  new THREE.Vector3(-0.6, 1.6, -1.0),
];
const AI_NODES = [
  { label: "ChatGPT", pos: [2.4, 1.1, 0.4] },
  { label: "Gemini", pos: [-2.6, 0.6, -0.6] },
  { label: "Claude", pos: [1.6, -1.6, 0.8] },
  { label: "Perplexity", pos: [-1.8, -1.3, 0.5] },
  { label: "Google", pos: [0.2, 2.1, -0.8] },
].map((n) => ({ ...n, color: engineColor(n.label) }));

/**
 * Distribute N nodes across a few loose cluster shells (offset Fibonacci
 * spheres) so they read as distinct "search clusters" rather than one even
 * shell. Each node carries the index of the cluster it belongs to.
 */
function makeNodes(count: number, radius: number): { pos: THREE.Vector3; cluster: number }[] {
  const pts: { pos: THREE.Vector3; cluster: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const cluster = i % CLUSTER_CENTERS.length;
    // Small shell around the cluster center, jittered per node.
    const shell = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(
      radius * (0.42 + (i % 5) * 0.05),
    );
    pts.push({ pos: CLUSTER_CENTERS[cluster].clone().multiplyScalar(0.85).add(shell), cluster });
  }
  return pts;
}

/**
 * The hero "SEO Intelligence Engine": a slowly-rotating neural sphere of
 * keyword nodes wired to five glowing AI-engine nodes. The whole rig parallaxes
 * toward the pointer and tilts as the page scrolls.
 */
function HeroEngineContent() {
  const group = useRef<THREE.Group>(null);

  const { nodes, linePositions, lineColors } = useMemo(() => {
    const nodes = makeNodes(NODE_COUNT, 2.6);
    // Color each cluster by the AI-engine node nearest to its center, so the
    // web visibly "belongs" to the engines it feeds.
    const clusterColor = CLUSTER_CENTERS.map((center) => {
      let best = AI_NODES[0];
      let bestD = Infinity;
      for (const ai of AI_NODES) {
        const d = center.distanceToSquared(new THREE.Vector3(...(ai.pos as [number, number, number])));
        if (d < bestD) [best, bestD] = [ai, d];
      }
      return new THREE.Color(best.color);
    });
    // Connect each node to its 2 nearest neighbors within the same cluster.
    const seg: number[] = [];
    const col: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const dists = nodes
        .map((n, j) => ({ j, d: nodes[i].pos.distanceTo(n.pos), c: n.cluster }))
        .filter((o) => o.j !== i && o.c === nodes[i].cluster)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      const cc = clusterColor[nodes[i].cluster];
      for (const { j } of dists) {
        const a = nodes[i].pos;
        const b = nodes[j].pos;
        seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
        col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
      }
    }
    return { nodes, linePositions: new Float32Array(seg), lineColors: new Float32Array(col) };
  }, []);

  const nodePositions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => arr.set([n.pos.x, n.pos.y, n.pos.z], i * 3));
    return arr;
  }, [nodes]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const scroll = typeof window !== "undefined" ? window.scrollY / window.innerHeight : 0;
    // Pointer parallax + scroll tilt, smoothed.
    easing.damp(group.current.rotation, "x", pointer.ny * 0.3 + scroll * 0.6, 0.4, delta);
    easing.damp(group.current.rotation, "y", pointer.nx * 0.4 + state.clock.elapsedTime * 0.05, 0.4, delta);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 6, 6]} intensity={40} color={C.blue} />
      <pointLight position={[-6, -4, 2]} intensity={30} color={C.purple} />

      <group ref={group}>
        {/* keyword nodes */}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.09}
            color={C.node}
            transparent
            opacity={0.9}
            sizeAttenuation
            depthWrite={false}
          />
        </points>

        {/* neural connections, tinted per cluster by nearest engine */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial vertexColors transparent opacity={0.28} depthWrite={false} />
        </lineSegments>

        {/* glowing AI-engine nodes */}
        {AI_NODES.map((n) => (
          <Float key={n.label} speed={2} rotationIntensity={0} floatIntensity={0.6}>
            <mesh position={n.pos as [number, number, number]}>
              <sphereGeometry args={[0.16, 24, 24]} />
              <meshStandardMaterial
                color={n.color}
                emissive={n.color}
                emissiveIntensity={2.2}
                toneMapped={false}
              />
            </mesh>
          </Float>
        ))}
      </group>
    </>
  );
}

/** Canvas-wrapped scene — this is what `Lazy3D` dynamically imports. */
export default function HeroEngine() {
  return (
    <Scene frameloop="always" cameraPosition={[0, 0, 7]} cameraFov={50}>
      <HeroEngineContent />
    </Scene>
  );
}
