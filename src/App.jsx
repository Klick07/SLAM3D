
import { useRef, useState, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import {
  KeyboardControls,
  useKeyboardControls,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "brake", keys: ["Space"] },
  { name: "cameraToggle", keys: ["KeyC"] },
];

function Environment() {
  const roadGLTF = useGLTF("/city.glb");
  const treeGLTF = useGLTF("/tree.glb");

  const trees = useMemo(() => {
    const temp = [];
    let i = 0;
    while (temp.length < 30) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;

      if (Math.abs(x) < 12) {
        i++;
        continue;
      }

      temp.push({
        id: temp.length,
        pos: [x, 0, z],
        scale: 0.8 + Math.random() * 0.4,
      });
    }
    return temp;
  }, []);

  return (
    <>
      {/* 1. PHYSICS REMOVED: Road is purely visual so it cannot trap the car */}
      <primitive object={roadGLTF.scene} scale={10} position={[0, -4.35, 0]} receiveShadow />

      {/* 2. PHYSICS REMOVED: Trees are purely visual so their bounding boxes don't overlap */}
      {trees.map((t) => (
        <primitive
          key={`tree-${t.id}`}
          object={treeGLTF.scene.clone()}
          position={t.pos}
          scale={t.scale}
          castShadow
          receiveShadow
        />
      ))}

      {/* 3. THE ONLY COLLIDER: A mathematically perfect, thick floor to stop falling */}
      <RigidBody type="fixed" friction={5} restitution={0}>
        <CuboidCollider args={[200, 2, 200]} position={[0, -2, 0]} />
        <mesh
          receiveShadow
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#4a7c59" roughness={0.8} />
        </mesh>
      </RigidBody>
    </>
  );
}

function Vehicle({ telemetry, setTelemetry, cameraMode, setCameraMode }) {
  const chassisRef = useRef(null);
  const visualGroupRef = useRef(null);

  // Keep a ref to track previous velocity for acceleration calculations
  const prevLinvel = useRef(new THREE.Vector3());
  const mass = 45;    

  const roverGLTF = useGLTF("/rover.glb");

  //////////animation.///////////////////////////////animation.///////////////////////////////animation./////////////////////

  useMemo(() => {
    roverGLTF.scene.rotation.y = Math.PI;
  }, [roverGLTF.scene]);

  const slicedAnimations = useMemo(() => {
    if (!roverGLTF.animations.length) return [];
    const masterClip = roverGLTF.animations[0];
    const fps = 30;

    return [
      THREE.AnimationUtils.subclip(masterClip, "Startup", 0, 9 * fps, fps),
    ];
  }, [roverGLTF.animations]);
  const { actions } = useAnimations(slicedAnimations, visualGroupRef);
  const [, getKeys] = useKeyboardControls();
  useEffect(() => {
    const startupAction = actions["Startup"];
    if (startupAction) {
      startupAction.setLoop(THREE.LoopOnce, 1);
      startupAction.clampWhenFinished = true;
      startupAction.play();
    }
  }, [actions]);
  //////////animation.///////////////////////////////animation.///////////////////////////////animation./////////////////////

  const lastToggle = useRef(0);
  const headingAngle = useRef(0);
  const steerAngle = useRef(0);
  const currentCamPos = useRef(new THREE.Vector3());
  const currentTargetPos = useRef(new THREE.Vector3());
  const MAX_STEER = 1;

  // Play an idle or default animation on mount

  useFrame((state, delta) => {
    if (!chassisRef.current || !visualGroupRef.current) return;

    const { forward, backward, left, right, brake, cameraToggle } = getKeys();

    // -------------------------------
    const now = state.clock.getElapsedTime();
    if (cameraToggle && now - lastToggle.current > 0.3) {
      setCameraMode((prev) => (prev + 1) % 3);
      lastToggle.current = now;
    }

    let targetSteer = 0;
    if (left) targetSteer += MAX_STEER;
    if (right) targetSteer -= MAX_STEER;
    steerAngle.current = THREE.MathUtils.lerp(
      steerAngle.current,
      targetSteer,
      10 * delta,
    );

    const linvel = chassisRef.current.linvel();
    const currentVel = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
    const speedVal = new THREE.Vector3(linvel.x, 0, linvel.z).length();

    // Acceleration = change in velocity / delta time
    const velDiff = currentVel.clone().sub(prevLinvel.current);
    const accelVal = velDiff.length() / delta;

    // Force = mass * acceleration (Newton's Second Law)
    const forceVal = mass * accelVal;

    // Save current velocity for the next frame
    prevLinvel.current.copy(currentVel);

    // Update React state throttled or every frame (keeping UI responsive)
    setTelemetry({
      speed: speedVal.toFixed(2),
      acceleration: accelVal.toFixed(2),
      force: forceVal.toFixed(1),
    });

    if (forward || backward || speedVal > 0.05) {
      const driveDirSign = forward ? 1 : backward ? -1 : 1;
      headingAngle.current += steerAngle.current * 2.0 * delta * driveDirSign;
    }

    const driveDir = new THREE.Vector3(
      -Math.sin(headingAngle.current),
      0,
      -Math.cos(headingAngle.current),
    );

    let targetVelocityX = 0;
    let targetVelocityZ = 0;
    const currentYVel = linvel.y;

    if (forward) {
      targetVelocityX = driveDir.x * 15;
      targetVelocityZ = driveDir.z * 15;
    } else if (backward) {
      targetVelocityX = driveDir.x * -15;
      targetVelocityZ = driveDir.z * -15;
    } else if (brake) {
      targetVelocityX = linvel.x * 0.9;
      targetVelocityZ = linvel.z * 0.9;
    } else {
      targetVelocityX = linvel.x * 0.92;
      targetVelocityZ = linvel.z * 0.92;
    }

    chassisRef.current.setLinvel(
      { x: targetVelocityX, y: currentYVel, z: targetVelocityZ },
      true,
    );

    visualGroupRef.current.rotation.y = headingAngle.current;

    const carPos = chassisRef.current.translation();
    const posVec = new THREE.Vector3(carPos.x, carPos.y, carPos.z);
    let targetCamPos = new THREE.Vector3();
    let lookAtTarget = posVec.clone().add(new THREE.Vector3(0, 1.2, 0));

    if (cameraMode === 0) {
      targetCamPos = posVec
        .clone()
        .add(driveDir.clone().negate().multiplyScalar(12))
        .add(new THREE.Vector3(0, 6, 0));
    } else if (cameraMode === 1) {
      targetCamPos = posVec.clone().add(new THREE.Vector3(0, 35, 0.1));
    } else if (cameraMode === 2) {
      targetCamPos = posVec
        .clone()
        .add(driveDir.clone().multiplyScalar(0.5))
        .add(new THREE.Vector3(0, 4, 0));
      lookAtTarget = posVec.clone().add(driveDir.clone().multiplyScalar(10));
    }

    currentCamPos.current.lerp(targetCamPos, 0.1);
    currentTargetPos.current.lerp(lookAtTarget, 0.1);

    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentTargetPos.current);
  });

  return (
    <RigidBody
      ref={chassisRef}
      type="dynamic"
      position={[0, 4, 0]}
      mass={45}
      friction={1.5}
      canSleep={false}
      linearDamping={0.2}
      angularDamping={0.2}
      lockRotations
      colliders={false}
    >
      <CuboidCollider args={[1.2, 0.5, 2.4]} position={[0, 0.5, 0]} />
      <group ref={visualGroupRef}>
        <primitive
          object={roverGLTF.scene}
          position={[0, 0, 0]}
          scale={1.0}
          castShadow
          receiveShadow
        />
      </group>
    </RigidBody>
  );
}

useGLTF.preload("/rover.glb");

useGLTF.preload("/truck.glb");
useGLTF.preload("/city.glb");
useGLTF.preload("/tree.glb");
useGLTF.preload("/grass.glb");

export default function App() {
  const [telemetry, setTelemetry] = useState({
    speed: "0.00",
    acceleration: "0.00",
    force: "0.0",
  });
  const [cameraMode, setCameraMode] = useState(0);
  return (
    <KeyboardControls map={keyboardMap}>
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "#fff",
          zIndex: 10,
          fontFamily: "monospace",
          background: "rgba(0,0,0,0.5)",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        <p>
          <strong>WASD / Arrows</strong>: Drive & Steering
        </p>
        <p>
          <strong>Space</strong>: Brake
        </p>
        <hr style={{ borderColor: "rgba(255,255,255,0.2)", margin: "8px 0" }} />
        <p>
          <strong>Speed:</strong> {telemetry.speed} m/s
        </p>
        <p>
          <strong>Acceleration:</strong> {telemetry.acceleration} m/s²
        </p>
        <p>
          <strong>Force:</strong> {telemetry.force} N
        </p>
        <hr style={{ borderColor: "rgba(255,255,255,0.2)", margin: "8px 0" }} />
        <button
          onClick={() => setCameraMode((prev) => (prev + 1) % 3)}
          style={{
            background: "#4a7c59",
            color: "#fff",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Change Camera (Mode {cameraMode + 1}/3)
        </button>
      </div>

      <Canvas shadows
      gl={{ shadowMap: { type: THREE.PCFShadowMap } }}
       camera={{ position: [0, 8, 14], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[30, 50, 20]}
          castShadow
          intensity={2.5}
          shadow-mapSize={[2048, 2048]}
        />
        <hemisphereLight
          skyColor={"#ffffff"}
          groundColor={"#444444"}
          intensity={1.0}
        />
        <color attach="background" args={["#87ceeb"]} />

        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Vehicle
              telemetry={telemetry}
              setTelemetry={setTelemetry}
              cameraMode={cameraMode}
              setCameraMode={setCameraMode}
            />
            <Environment />
          </Physics>
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}