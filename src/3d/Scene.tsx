import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { HallModel } from './HallModel'
import type { HallParameters, CalculationResults, CladdingParameters, Opening, OpeningType, SkylightParameters } from '../types'

// Seeded random for deterministic tree placement
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate tree positions at 30-80m from center, 10 trees
const TREE_DATA: { position: [number, number, number]; scale: number; seed: number }[] = (() => {
  const trees: { position: [number, number, number]; scale: number; seed: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + seededRandom(i * 7) * 0.5;
    const distance = 30 + seededRandom(i * 13) * 50;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const scale = 0.8 + seededRandom(i * 17) * 0.7;
    trees.push({ position: [x, 0, z], scale, seed: i });
  }
  return trees;
})();

function Tree({ position, scale, seed }: { position: [number, number, number]; scale: number; seed: number }) {
  // Generate slightly varied crown colors
  const crownColor1 = `hsl(${110 + seededRandom(seed * 3) * 30}, ${50 + seededRandom(seed * 5) * 20}%, ${25 + seededRandom(seed * 7) * 15}%)`;
  const crownColor2 = `hsl(${100 + seededRandom(seed * 11) * 40}, ${45 + seededRandom(seed * 13) * 25}%, ${20 + seededRandom(seed * 17) * 18}%)`;
  const crownColor3 = `hsl(${115 + seededRandom(seed * 19) * 25}, ${55 + seededRandom(seed * 23) * 15}%, ${28 + seededRandom(seed * 29) * 12}%)`;

  const jitterX = (seededRandom(seed * 31) - 0.5) * 0.5;
  const jitterZ = (seededRandom(seed * 37) - 0.5) * 0.5;

  return (
    <group position={position} scale={scale}>
      {/* Trunk - tapered cone */}
      <mesh position={[0, 2, 0]} castShadow>
        <coneGeometry args={[0.15, 4, 8]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.9} />
      </mesh>
      {/* Crown sphere 1 - main */}
      <mesh position={[0, 5, 0]} castShadow>
        <sphereGeometry args={[2.0, 12, 10]} />
        <meshStandardMaterial color={crownColor1} roughness={0.8} />
      </mesh>
      {/* Crown sphere 2 - offset */}
      <mesh position={[0.8 + jitterX, 5.5, 0.5 + jitterZ]} castShadow>
        <sphereGeometry args={[1.5, 10, 8]} />
        <meshStandardMaterial color={crownColor2} roughness={0.8} />
      </mesh>
      {/* Crown sphere 3 - offset other side */}
      <mesh position={[-0.6 + jitterX, 4.8, -0.4 + jitterZ]} castShadow>
        <sphereGeometry args={[1.3, 10, 8]} />
        <meshStandardMaterial color={crownColor3} roughness={0.8} />
      </mesh>
    </group>
  );
}

interface SceneProps {
  params: HallParameters;
  results: CalculationResults;
  cladding?: CladdingParameters;
  showCladding?: boolean;
  openings?: Opening[];
  placementMode?: boolean;
  onPlaceOpening?: (opening: Opening) => void;
  selectedOpeningType?: OpeningType;
  openingWidth?: number;
  openingHeight?: number;
  sillHeight?: number;
  skylight?: SkylightParameters;
}

function SceneContent({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight, skylight }: SceneProps) {
  // Procedural grass texture
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 50000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = 0.8 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(${Math.floor(60 * brightness)}, ${Math.floor(100 * brightness)}, ${Math.floor(50 * brightness)}, 0.3)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);
    return tex;
  }, []);

  return (
    <>
      {/* Environment with park preset */}
      <Environment preset="park" background />

      {/* Hemisphere light for natural ambient */}
      <hemisphereLight args={['#87ceeb', '#3d5c2e', 0.4]} />

      {/* Main directional light with high-quality shadows */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={150}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* Ground plane with grass texture */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial map={grassTexture} roughness={1.0} metalness={0} />
      </mesh>

      {/* Trees */}
      {TREE_DATA.map((tree, i) => (
        <Tree key={i} position={tree.position} scale={tree.scale} seed={tree.seed} />
      ))}

      {/* 3D Hall Model */}
      <HallModel
        params={params}
        results={results}
        cladding={cladding}
        showCladding={showCladding}
        openings={openings}
        placementMode={placementMode}
        onPlaceOpening={onPlaceOpening}
        selectedOpeningType={selectedOpeningType}
        openingWidth={openingWidth}
        openingHeight={openingHeight}
        sillHeight={sillHeight}
        skylight={skylight}
      />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
        zoomToCursor={true}
      />
    </>
  )
}

export function Scene({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight, skylight }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 15, 20], fov: 50 }}
      gl={{ antialias: true }}
      className="w-full h-full"
    >
      <SceneContent
        params={params}
        results={results}
        cladding={cladding}
        showCladding={showCladding}
        openings={openings}
        placementMode={placementMode}
        onPlaceOpening={onPlaceOpening}
        selectedOpeningType={selectedOpeningType}
        openingWidth={openingWidth}
        openingHeight={openingHeight}
        sillHeight={sillHeight}
        skylight={skylight}
      />
    </Canvas>
  )
}
