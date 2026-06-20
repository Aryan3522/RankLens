import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { random } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { pointer } from "../usePointer";
import { C } from "../palette";

/**
 * Subtle drifting particle cloud used as an ambient backdrop behind in-app
 * pages. Cheap (one points cloud), slow, and pointer-reactive — atmosphere
 * without distraction.
 */
function AmbientFieldContent() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    random.inSphere(arr, { radius: 6 });
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, pointer.ny * 0.15, 2, delta);
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, pointer.nx * 0.15, 2, delta);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={C.blue}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/** Canvas-wrapped ambient field loaded lazily by `Lazy3D`. */
export default function AmbientField() {
  return (
    <Scene frameloop="always" cameraPosition={[0, 0, 6]} cameraFov={60}>
      <AmbientFieldContent />
    </Scene>
  );
}
