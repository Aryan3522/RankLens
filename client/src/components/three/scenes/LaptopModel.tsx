import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, useGLTF } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import { Scene } from "../Scene";
import { C } from "../palette";
import type { TierConfig } from "../useDeviceTier";

const MODEL_URL = "/models/laptop.glb";
useGLTF.preload(MODEL_URL);

/**
 * Mutable, render-free bridge between the DOM scroll layer (CinematicLaptopStage,
 * Framer Motion) and the R3F render loop. The stage writes `progress`/`scene`
 * every change; `LaptopRig` reads `.current` inside useFrame so scroll never
 * triggers React re-renders of the canvas.
 */
export type StageState = { progress: number; scene: number; sceneCount: number };

/**
 * Cinematic keyframes at fixed scroll-progress points (one per slide), including
 * scale so the laptop can travel, settle centre, then dolly + scale INTO the
 * screen on the final slide until it overflows the viewport.
 *   0.00 hero — right, 3/4         0.25 AI — left, 3/4
 *   0.50 insights — centre         0.75 showcase — centre, fills the frame
 *   1.00 zoom — dollied in + scaled up so the screen overflows (then faded out)
 */
const KEYS = [
  // Slide 1 — laptop on the RIGHT (copy on the left).
  { p: 0.0, x: 1.0, y: -0.2, z: 0.2, rotY: -0.55, rotX: 0.1, rotZ: 0, s: 1.25 },
  // Slide 2 — laptop clearly on the LEFT (copy on the right).
  { p: 0.25, x: -0.8, y: -0.18, z: 0.25, rotY: 0.55, rotX: 0.09, rotZ: 0, s: 1.15 },
  // Insights = the "original" cruising size; the scale-up climax begins here.
  { p: 0.5, x: 0, y: -0.05, z: 0.4, rotY: -0.1, rotX: 0.06, rotZ: 0, s: 1.2 },
  // Showcase: centre, face-on — the laptop scales UP to its peak (the climax).
  { p: 0.75, x: 0, y: 0, z: 0.55, rotY: 0, rotX: 0.05, rotZ: 0, s: 1.5 },
  // Exit: as the lid folds shut the laptop scales DOWN to 0.85 so the closing
  // pose stays comfortably inside the frame (no overflow).
  { p: 1.0, x: 0, y: 0, z: 0.4, rotY: 0.4, rotX: 0.18, rotZ: 0.1, s: 0.85 },
];

function poseFor(p: number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = THREE.MathUtils.smoothstep((p - a.p) / (b.p - a.p || 1), 0, 1);
  const L = THREE.MathUtils.lerp;
  return {
    x: L(a.x, b.x, t),
    y: L(a.y, b.y, t),
    z: L(a.z, b.z, t),
    rotY: L(a.rotY, b.rotY, t),
    rotX: L(a.rotX, b.rotX, t),
    rotZ: L(a.rotZ, b.rotZ, t),
    s: L(a.s, b.s, t),
  };
}

/** Rectangle of the laptop's display panel, expressed in the LaptopRig group's
 *  local space, so the Html overlay can be sat exactly on its plane (the model's
 *  lid is reclined, so we carry a full rotation, not just a position). */
type ScreenFrame = { pos: [number, number, number]; rot: [number, number, number]; w: number; h: number };

const TARGET_WIDTH = 2.6; // base width; per-keyframe scale tunes on-screen size

const SCREEN_MESH = "Box20311_1_1"; // the display quad in the Poly-by-Google model

/**
 * Loads the CC-BY generic laptop GLB once and prepares it for the stage:
 * rotates it to face the camera (the model's screen natively faces −X), swaps
 * its baked materials for clean PBR aluminium + a dark glass screen, normalizes
 * scale + re-centers, then measures the actual screen quad (4 verts) to derive
 * the exact plane — position, in-plane size, and orientation (the lid reclines)
 * — so the live dashboard sits flush even though the screen is tilted.
 */
function useLaptop(): {
  model: THREE.Group;
  screen: ScreenFrame;
  lid: THREE.Object3D;
  lidAxis: THREE.Vector3;
  hinge: [number, number, number];
  foldAxis: [number, number, number];
  openAngle: number;
} {
  const { scene } = useGLTF(MODEL_URL);

  return useMemo(() => {
    const root = new THREE.Group();
    root.add(scene.clone(true));
    // The model's screen normal is ~−X; turn the whole thing to face the camera.
    root.rotation.y = Math.PI / 2;
    root.updateWorldMatrix(true, true);

    // Premium PBR: brushed-aluminium chassis (clearcoat sheen), dark matte keys,
    // and glossy black screen glass — reads as a real laptop, unlike the model's
    // flat baked textures.
    const aluminium = new THREE.MeshPhysicalMaterial({
      color: "#aeb4c0", metalness: 0.95, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.45, envMapIntensity: 1.6, transparent: true,
    });
    const keyMat = new THREE.MeshStandardMaterial({ color: "#1b1e25", metalness: 0.45, roughness: 0.55, transparent: true });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#04060b", metalness: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.2, transparent: true,
    });
    const mats = [aluminium, keyMat, glass];
    const tmp = new THREE.Vector3();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.name === SCREEN_MESH) {
        m.material = glass;
        return;
      }
      // Small parts (the individual keys) get the dark matte material for contrast.
      const diag = new THREE.Box3().setFromObject(m).getSize(tmp).length();
      m.material = diag < 280 ? keyMat : aluminium;
    });

    // Normalize size, then re-center so the laptop pivots about its middle.
    root.updateWorldMatrix(true, true);
    const pre = new THREE.Box3().setFromObject(root);
    const size = pre.getSize(new THREE.Vector3());
    root.scale.setScalar(TARGET_WIDTH / size.x);
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    root.position.sub(box.getCenter(new THREE.Vector3()));
    root.updateWorldMatrix(true, true);

    // Derive the screen plane from the quad's 4 corners (group-local space).
    const mesh = root.getObjectByName(SCREEN_MESH) as THREE.Mesh | undefined;
    let screen: ScreenFrame = { pos: [0, 0, 0], rot: [0, 0, 0], w: 1, h: 1 };
    // Hinge point + fold axis derived from the screen's actual lower edge, so the
    // lid folds about its TRUE bottom edge (not assumed world-X). This is what
    // keeps both sides attached even if the model is slightly skewed.
    const hingePoint = new THREE.Vector3();
    const foldAxisWorld = new THREE.Vector3(1, 0, 0);
    // How far the lid is reclined from fully-shut (flat on the deck), so the
    // close animation can stop a fixed 15° shy of closed regardless of model.
    let openAngle = THREE.MathUtils.degToRad(105);
    if (mesh) {
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
      const v = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const v0 = v(0), v1 = v(1), v2 = v(2), v3 = v(3);
      const center = v0.clone().add(v1).add(v3).add(v2).multiplyScalar(0.25);
      let right = v1.clone().sub(v0).normalize();
      const up0 = v3.clone().sub(v0).normalize();
      let normal = right.clone().cross(up0).normalize();
      if (normal.z < 0) { normal.negate(); right.negate(); } // face the camera
      const up = normal.clone().cross(right).normalize();
      openAngle = normal.angleTo(new THREE.Vector3(0, 1, 0));
      const m = new THREE.Matrix4().makeBasis(right, up, normal);
      const e = new THREE.Euler().setFromRotationMatrix(m);
      // The lower of the two horizontal edges is the hinge; the fold axis runs
      // along it.
      const mid01 = v0.clone().add(v1).multiplyScalar(0.5);
      const mid32 = v3.clone().add(v2).multiplyScalar(0.5);
      const lowA = mid01.y <= mid32.y ? v0 : v3;
      const lowB = mid01.y <= mid32.y ? v1 : v2;
      hingePoint.copy(lowA).add(lowB).multiplyScalar(0.5);
      foldAxisWorld.copy(lowB).sub(lowA).normalize();
      const sc = center.clone().addScaledVector(normal, 0.012); // sit just in front of the glass
      screen = {
        pos: [sc.x, sc.y, sc.z],
        rot: [e.x, e.y, e.z],
        w: v1.distanceTo(v0),
        h: v3.distanceTo(v0),
      };
    }

    // Group the upper "lid" meshes onto a hinge pivot so the lid can fold shut on
    // the exit. The model is a flat list of un-sheared meshes, so attaching them
    // to a pivot preserves their look (no distortion).
    root.updateWorldMatrix(true, true);
    const allMeshes: THREE.Mesh[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) allMeshes.push(o as THREE.Mesh);
    });
    const full = new THREE.Box3().setFromObject(root);
    const splitY = full.min.y + (full.max.y - full.min.y) * 0.42; // hinge height
    const c = new THREE.Vector3();
    const lidMeshes = allMeshes.filter((m) => new THREE.Box3().setFromObject(m).getCenter(c).y > splitY);
    const lid = new THREE.Group();
    root.add(lid);
    lid.position.copy(root.worldToLocal(hingePoint.clone()));
    lid.updateWorldMatrix(true, true);
    for (const m of lidMeshes) lid.attach(m);
    lid.updateWorldMatrix(true, true);
    // Fold around the screen's true bottom-edge direction, in the pivot's space.
    const lidQinv = lid.getWorldQuaternion(new THREE.Quaternion()).invert();
    const lidAxis = foldAxisWorld.clone().applyQuaternion(lidQinv).normalize();

    return {
      model: root,
      screen,
      lid,
      lidAxis,
      hinge: [hingePoint.x, hingePoint.y, hingePoint.z],
      foldAxis: [foldAxisWorld.x, foldAxisWorld.y, foldAxisWorld.z],
      openAngle,
    };
  }, [scene]);
}

function LaptopRig({
  stage,
  tier,
  screen,
}: {
  stage: React.RefObject<StageState>;
  tier: TierConfig;
  screen: ReactNode;
}) {
  const { model, screen: frame, lid, lidAxis, hinge, foldAxis, openAngle } = useLaptop();
  // Fold the lid to a fixed 15° shy of fully shut (premium near-closed pose).
  const closeTarget = Math.max(0, openAngle - THREE.MathUtils.degToRad(15));
  const group = useRef<THREE.Group>(null);
  // Pivot the dashboard at the SAME hinge + SAME axis as the lid, so the screen
  // folds identically (both edges stay attached). No fade / no content change.
  const htmlPivot = useRef<THREE.Group>(null);
  const foldAxisVec = useMemo(() => new THREE.Vector3(...foldAxis), [foldAxis]);
  const animate = tier.frameloop === "always";

  // Map a fixed-px dashboard onto the measured display rectangle. In drei's
  // transform mode, worldWidth = pixelWidth · distanceFactor / 400 (parent scale
  // cancels), so distanceFactor = frameWidth · 400 / pixelWidth makes it fit.
  const INSET = 0.955; // sit just inside the glass, leaving a thin bezel
  const PX_W = 620;
  const df = (frame.w * INSET * 400) / PX_W;
  const pxH = Math.round((PX_W * frame.h) / frame.w);
  // Screen position relative to the hinge pivot (so rotating the pivot folds it).
  const screenOffset: [number, number, number] = [
    frame.pos[0] - hinge[0],
    frame.pos[1] - hinge[1],
    frame.pos[2] - hinge[2],
  ];

  // Static pose for the `demand` (reduced-motion-adjacent) path: render once.
  useLayoutEffect(() => {
    if (!animate && group.current) {
      const p = poseFor(0);
      group.current.position.set(p.x, p.y, p.z);
      group.current.rotation.set(p.rotX, p.rotY, 0);
      group.current.scale.setScalar(p.s);
    }
  }, [animate]);

  useFrame((state, delta) => {
    if (!group.current || !animate) return;
    const p = stage.current ? stage.current.progress : 0;
    const t = state.clock.elapsedTime;
    const pose = poseFor(p);
    // Idle float/breathing settles as the laptop centres for the lid-close.
    const idle = THREE.MathUtils.clamp(1 - (p - 0.5) / 0.1, 0, 1);

    // Exit (starts as you leave slide 4): fold the lid partway. The dashboard
    // pivot folds by the same angle around the same hinge, so the screen stays
    // visible and attached as it tilts with the lid.
    // Fold the lid + the screen together around the shared hinge — the screen
    // stays exactly as-is (no fade, no swap), just tilts with the lid.
    const close = THREE.MathUtils.smoothstep(p, 0.78, 0.97);
    const fold = closeTarget * close;
    lid.quaternion.setFromAxisAngle(lidAxis, fold);
    if (htmlPivot.current) htmlPivot.current.quaternion.setFromAxisAngle(foldAxisVec, fold);

    // On wider viewports push the off-centre poses further out AND scale the
    // laptop up so it fills its ~50% half (centred poses, x≈0, only scale).
    // Ramp from the lg breakpoint (1024) so the laptop fills its ~50% column at
    // every desktop width, not just ultra-wide. xMul pushes it deeper into the
    // right half; sMul scales it up to occupy that half.
    const wide = THREE.MathUtils.clamp((state.size.width - 1024) / 760, 0, 1);
    // Gentler off-centre push on wide viewports (the old 0.7 threw the laptop
    // too far right). Plus a small global left nudge so the whole object sits a
    // touch more to the left and the centred poses read as truly centred.
    const xMul = 1 + wide * 0.22;
    const X_SHIFT = -0.08;
    // ~5% smaller than before across all widths so the laptop no longer
    // overflows the frame — choreography/positions/rotations are unchanged.
    const sMul = 0.95 + wide * 0.33;
    // Scale is driven purely by the keyframes: cruise at the original size,
    // peak on the showcase, then settle back to the original as the lid folds.
    const targetScale = pose.s * sMul;

    // Scroll-driven travel + scale (the only motion — no pointer parallax).
    // Nudge the whole laptop up ~30px so it sits a touch higher in the frame.
    easing.damp3(group.current.position, [pose.x * xMul + X_SHIFT, pose.y + 0.08 + Math.sin(t * 0.6) * 0.04 * idle, pose.z], 0.4, delta);
    easing.damp3(group.current.scale, [targetScale, targetScale, targetScale], 0.4, delta);
    easing.damp(group.current.rotation, "y", pose.rotY + Math.sin(t * 0.3) * 0.02 * idle, 0.5, delta);
    easing.damp(group.current.rotation, "x", pose.rotX, 0.5, delta);
    easing.damp(group.current.rotation, "z", pose.rotZ + Math.sin(t * 0.4) * 0.01 * idle, 0.6, delta);
  });

  return (
    <group ref={group} scale={1.25}>
      <primitive object={model} />
      {/* Live dashboard, pivoted at the lid hinge so it folds with the lid. */}
      <group ref={htmlPivot} position={hinge}>
        <Html
          transform
          position={screenOffset}
          rotation={frame.rot}
          distanceFactor={df}
          zIndexRange={[10, 0]}
          occlude={false}
          wrapperClass="laptop-html-wrapper"
          pointerEvents="none"
        >
          <div className="laptop-html-screen" style={{ width: PX_W, height: pxH }}>
            {screen}
          </div>
        </Html>
      </group>
    </group>
  );
}

/**
 * The real GLB laptop centerpiece. Always rendered where WebGL exists (the
 * `tier` only grades quality); the `tier==="none"` poster path lives in the
 * stage, not here. Self-contained reflections via in-scene Lightformers (no CDN
 * HDR), blue/purple rim lights, and a contact shadow ground the laptop.
 */
export default function LaptopModel({
  stage,
  tier,
  screen,
}: {
  stage: React.RefObject<StageState>;
  tier: TierConfig;
  screen: ReactNode;
}) {
  return (
    <Scene
      frameloop={tier.frameloop}
      cameraPosition={[0, 0.12, 5.6]}
      cameraFov={38}
      dpr={tier.tier === "high" ? [1, 2] : [1, 1.6]}
    >
      <ambientLight intensity={1.35} />
      {/* main key + a dedicated overhead light so the keyboard deck reads clearly */}
      <directionalLight position={[2, 7, 5]} intensity={4.2} />
      <directionalLight position={[0, 8, 2]} intensity={2.6} />
      <directionalLight position={[-3, 3, 5]} intensity={1.6} />
      <pointLight position={[0, 3, 3]} intensity={30} color="#fff4e2" />
      <pointLight position={[-5, 2, 3]} intensity={30} color={C.blue} />
      <pointLight position={[5, -1, 3]} intensity={22} color={C.purple} />

      <LaptopRig stage={stage} tier={tier} screen={screen} />

      {tier.shadows && (
        <ContactShadows position={[0, -1.15, 0]} opacity={0.5} scale={9} blur={2.6} far={3.2} resolution={512} />
      )}

      {/* In-scene environment for metallic reflections — no external HDR file. */}
      <Environment resolution={tier.envResolution}>
        <Lightformer intensity={3.2} position={[0, 4, 3]} scale={[10, 4, 1]} color="#ffffff" />
        <Lightformer intensity={2} position={[-5, 1, 2]} scale={[3, 5, 1]} color={C.blue} />
        <Lightformer intensity={1.8} position={[5, 0, 2]} scale={[3, 5, 1]} color={C.purple} />
        <Lightformer intensity={1.2} position={[0, -2, 3]} scale={[8, 2, 1]} color="#2a2f38" />
      </Environment>
    </Scene>
  );
}
