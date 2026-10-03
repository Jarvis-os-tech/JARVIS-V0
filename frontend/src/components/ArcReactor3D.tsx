import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ArcReactor3DProps {
  connectionState: string;
  volume: number; // 0 - 100
  themeColor?: string;
  secondaryColor?: string;
  isMuted?: boolean;
}

// Inner Plasma Core
function PlasmaCore({ volume, connectionState, themeColor = '#00f0ff', secondaryColor = '#3b82f6' }: {
  volume: number;
  connectionState: string;
  themeColor: string;
  secondaryColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const isSpeaking = connectionState === 'speaking';
  const isListening = connectionState === 'listening';

  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current) return;
    const time = state.clock.getElapsedTime();

    // Scale pulsating with volume
    const volScale = 1 + (volume / 100) * 0.55;
    const pulse = 1 + Math.sin(time * 4) * 0.05;
    const targetScale = volScale * pulse;

    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    glowRef.current.scale.lerp(new THREE.Vector3(targetScale * 1.3, targetScale * 1.3, targetScale * 1.3), delta * 6);

    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.rotation.x += delta * 0.2;

    if (lightRef.current) {
      lightRef.current.intensity = 2.5 + (volume / 100) * 4;
    }
  });

  const coreColor = isSpeaking ? '#60a5fa' : isListening ? themeColor : themeColor;

  return (
    <group>
      <pointLight ref={lightRef} color={coreColor} intensity={3} distance={10} decay={2} />
      
      {/* Inner Dense Plasma Core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={2.5}
          roughness={0.1}
          metalness={0.8}
          wireframe={isListening}
        />
      </mesh>

      {/* Volumetric Holographic Outer Glow Shell */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.9, 24, 24]} />
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Induction Coils Array
function InductionCoils({ themeColor }: { themeColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const coilCount = 10;

  const coils = useMemo(() => {
    const items = [];
    const radius = 1.35;
    for (let i = 0; i < coilCount; i++) {
      const angle = (i / coilCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      items.push({ x, y, angle });
    }
    return items;
  }, [coilCount]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {coils.map((c, i) => (
        <group key={i} position={[c.x, c.y, 0]} rotation={[0, 0, c.angle + Math.PI / 2]}>
          {/* Copper Coil Geometry */}
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 0.45, 16]} />
            <meshStandardMaterial
              color="#d97706"
              emissive="#b45309"
              emissiveIntensity={0.6}
              roughness={0.3}
              metalness={0.9}
            />
          </mesh>
          {/* Glowing Neon Cap */}
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={themeColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Rotating Titanium Stator Rings
function StatorRings({ themeColor }: { themeColor: string }) {
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * 0.4;
    if (outerRingRef.current) outerRingRef.current.rotation.z += delta * 0.2;
  });

  return (
    <group>
      {/* Inner Machined Titanium Ring */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[1.7, 0.05, 16, 64]} />
        <meshStandardMaterial
          color="#334155"
          emissive={themeColor}
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Outer Segmented Calibration Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[2.05, 0.06, 16, 48]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={themeColor}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.9}
          wireframe
        />
      </mesh>
    </group>
  );
}

// Orbiting Photon Particles
function PhotonParticles({ count = 100, volume, themeColor }: { count?: number; volume: number; themeColor: string }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const initial = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.1 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      initial[i * 3] = x;
      initial[i * 3 + 1] = y;
      initial[i * 3 + 2] = z;
    }
    return [pos, initial];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const speedMultiplier = 1 + (volume / 100) * 3;
    pointsRef.current.rotation.y += delta * 0.4 * speedMultiplier;
    pointsRef.current.rotation.z += delta * 0.2 * speedMultiplier;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={themeColor}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Scene Root with Cursor Parallax Tilt
function ReactorScene({ connectionState, volume, themeColor, secondaryColor }: {
  connectionState: string;
  volume: number;
  themeColor: string;
  secondaryColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Interactive mouse tilt with spring damping
    const targetRotX = (state.pointer.y * 0.35);
    const targetRotY = (state.pointer.x * 0.35);

    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 4);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 4);
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -3]} color={secondaryColor} intensity={0.8} />

      <PlasmaCore
        connectionState={connectionState}
        volume={volume}
        themeColor={themeColor}
        secondaryColor={secondaryColor}
      />
      <InductionCoils themeColor={themeColor} />
      <StatorRings themeColor={themeColor} />
      <PhotonParticles count={110} volume={volume} themeColor={themeColor} />
    </group>
  );
}

export const ArcReactor3D: React.FC<ArcReactor3DProps> = ({
  connectionState,
  volume,
  themeColor = '#00f0ff',
  secondaryColor = '#38bdf8',
}) => {
  return (
    <div className="w-full h-full relative cursor-pointer select-none">
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <ReactorScene
          connectionState={connectionState}
          volume={volume}
          themeColor={themeColor}
          secondaryColor={secondaryColor}
        />
      </Canvas>
    </div>
  );
};

export default ArcReactor3D;
